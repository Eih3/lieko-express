'use strict';

const fs = require('fs');
const path = require('path');

const { getMimeType } = require('../helpers/mimes');

const serveStatic = (root, options = {}) => {
    const opts = {
        maxAge: options.maxAge || 0,
        index: options.index !== undefined ? options.index : 'index.html',
        dotfiles: options.dotfiles || 'ignore',
        etag: options.etag !== undefined ? options.etag : true,
        extensions: options.extensions || false,
        fallthrough: options.fallthrough !== undefined ? options.fallthrough : true,
        immutable: options.immutable || false,
        lastModified: options.lastModified !== undefined ? options.lastModified : true,
        redirect: options.redirect !== undefined ? options.redirect : true,
        setHeaders: options.setHeaders || null,
        cacheControl: options.cacheControl !== undefined ? options.cacheControl : true
    };

    const generateETag = (stats) => {
        const mtime = stats.mtime.getTime().toString(16);
        const size = stats.size.toString(16);
        return `W/"${size}-${mtime}"`;
    };

    return async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            return next();
        }

        try {
            let pathname = req.url;
            const qIndex = pathname.indexOf('?');
            if (qIndex !== -1) {
                pathname = pathname.substring(0, qIndex);
            }

            if (pathname === '') {
                pathname = '/';
            }

            try {
                pathname = decodeURIComponent(pathname);
            } catch (e) {
                if (opts.fallthrough) return next();
                return res.status(400).send('Bad Request');
            }

            let filePath = pathname === '/' ? root : path.join(root, pathname);

            const resolvedPath = path.resolve(filePath);
            const resolvedRoot = path.resolve(root);

            if (!resolvedPath.startsWith(resolvedRoot)) {
                if (opts.fallthrough) return next();
                return res.status(403).send('Forbidden');
            }

            let stats;
            try {
                stats = await fs.promises.stat(filePath);
            } catch (err) {
                if (pathname === '/' && opts.index) {
                    const indexes = Array.isArray(opts.index) ? opts.index : [opts.index];
                    for (const indexFile of indexes) {
                        const indexPath = path.join(root, indexFile);
                        try {
                            stats = await fs.promises.stat(indexPath);
                            if (stats.isFile()) {
                                filePath = indexPath;
                                break;
                            }
                        } catch (e) { }
                    }
                }

                if (!stats && opts.extensions && Array.isArray(opts.extensions)) {
                    let found = false;
                    for (const ext of opts.extensions) {
                        const testPath = filePath + (ext.startsWith('.') ? ext : '.' + ext);
                        try {
                            stats = await fs.promises.stat(testPath);
                            filePath = testPath;
                            found = true;
                            break;
                        } catch (e) { }
                    }
                    if (!found) return next();
                } else if (!stats) {
                    return next();
                }
            }

            if (stats.isDirectory()) {
                if (opts.redirect && !pathname.endsWith('/')) {
                    const query = qIndex !== -1 ? req.url.substring(qIndex) : '';
                    const redirectUrl = pathname + '/' + query;
                    return res.redirect(redirectUrl, 301);
                }

                if (opts.index) {
                    const indexes = Array.isArray(opts.index) ? opts.index : [opts.index];

                    for (const indexFile of indexes) {
                        const indexPath = path.join(filePath, indexFile);
                        try {
                            const indexStats = await fs.promises.stat(indexPath);
                            if (indexStats.isFile()) {
                                filePath = indexPath;
                                stats = indexStats;
                                break;
                            }
                        } catch (e) { }
                    }

                    if (stats.isDirectory()) {
                        if (opts.fallthrough) return next();
                        return res.status(404).send('Not Found');
                    }
                } else {
                    if (opts.fallthrough) return next();
                    return res.status(404).send('Not Found');
                }
            }

            if (opts.etag) {
                const etag = generateETag(stats);
                const ifNoneMatch = req.headers['if-none-match'];

                if (ifNoneMatch === etag) {
                    res.statusCode = 304;
                    res.end();
                    return;
                }

                res.setHeader('ETag', etag);
            }

            if (opts.lastModified) {
                const lastModified = stats.mtime.toUTCString();
                const ifModifiedSince = req.headers['if-modified-since'];

                if (ifModifiedSince === lastModified) {
                    res.statusCode = 304;
                    res.end();
                    return;
                }

                res.setHeader('Last-Modified', lastModified);
            }

            if (opts.cacheControl) {
                let cacheControl = 'public';

                if (opts.maxAge > 0) {
                    cacheControl += `, max-age=${opts.maxAge}`;
                }

                if (opts.immutable) {
                    cacheControl += ', immutable';
                }

                res.setHeader('Cache-Control', cacheControl);
            }

            const mimeType = getMimeType(filePath);
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Length', stats.size);

            if (typeof opts.setHeaders === 'function') {
                opts.setHeaders(res, filePath, stats);
            }

            if (req.method === 'HEAD') {
                return res.end();
            }

            const data = await fs.promises.readFile(filePath);
            res.end(data);
            return;

        } catch (error) {
            console.error('Static middleware error:', error);
            if (opts.fallthrough) return next();
            res.status(500).send('Internal Server Error');
        }
    };
};

module.exports = serveStatic;
