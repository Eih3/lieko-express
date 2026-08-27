const cors = (userOptions = {}) => {

    const defaultOptions = {
        enabled: true,
        debug: false,
        origin: "*",
        strictOrigin: false,
        allowPrivateNetwork: false,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        headers: ["Content-Type", "Authorization"],
        credentials: false,
        maxAge: 86400,
        exposedHeaders: []
    };

    const opts = { ...defaultOptions, ...userOptions };

    const _matchOrigin = (origin, allowedOrigin) => {
        if (!origin || !allowedOrigin) return false;
        if (Array.isArray(allowedOrigin)) {
            return allowedOrigin.some(o => _matchOrigin(origin, o));
        }
        if (allowedOrigin === "*") return true;
        if (allowedOrigin.includes("*")) {
            const regex = new RegExp("^" + allowedOrigin
                .replace(/\./g, "\\.")
                .replace(/\*/g, ".*") + "$");
            return regex.test(origin);
        }
        return origin === allowedOrigin;
    };

    const _logDebug = (req, finalOpts) => {
        if (!finalOpts.debug) return;
        console.log("\n[CORS DEBUG]");
        console.log("Request:", req.method, req.url);
        console.log("Origin:", req.headers.origin || "none");
        console.log("Applied CORS Policy:");
        console.log("  - Access-Control-Allow-Origin:", finalOpts.origin);
        console.log("  - Methods:", finalOpts.methods.join(", "));
        console.log("  - Headers:", finalOpts.headers.join(", "));
        if (finalOpts.credentials) console.log("  - Credentials: true");
        if (finalOpts.exposedHeaders?.length) console.log("  - Exposed:", finalOpts.exposedHeaders.join(", "));
        console.log("  - Max-Age:", finalOpts.maxAge);
        if (req.method === "OPTIONS") console.log("Preflight handled → 204\n");
    };

    const middleware = (req, res, next) => {
        if (!opts.enabled) return next();

        const requestOrigin = req.headers.origin || "";

        let finalOrigin = "*";

        if (opts.strictOrigin && requestOrigin) {
            const allowed = _matchOrigin(requestOrigin, opts.origin);
            if (!allowed) {
                res.statusCode = 403;
                return res.end(JSON.stringify({
                    error: "Origin Forbidden",
                    message: `Origin "${requestOrigin}" is not allowed`
                }));
            }
        }

        if (opts.origin === "*") {
            finalOrigin = "*";
        } else if (Array.isArray(opts.origin)) {
            const match = opts.origin.find(o => _matchOrigin(requestOrigin, o));
            finalOrigin = match || opts.origin[0];
        } else {
            finalOrigin = _matchOrigin(requestOrigin, opts.origin) ? requestOrigin : opts.origin;
        }

        _logDebug(req, { ...opts, origin: finalOrigin });

        res.setHeader("Access-Control-Allow-Origin", finalOrigin);

        if (opts.credentials) {
            res.setHeader("Access-Control-Allow-Credentials", "true");
        }

        if (opts.exposedHeaders?.length) {
            res.setHeader("Access-Control-Expose-Headers", opts.exposedHeaders.join(", "));
        }

        if (opts.allowPrivateNetwork && req.headers["access-control-request-private-network"] === "true") {
            res.setHeader("Access-Control-Allow-Private-Network", "true");
        }

        if (req.method === "OPTIONS") {
            res.setHeader("Access-Control-Allow-Methods", opts.methods.join(", "));
            res.setHeader("Access-Control-Allow-Headers", opts.headers.join(", "));
            res.setHeader("Access-Control-Max-Age", opts.maxAge);
            res.statusCode = 204;
            return res.end();
        }
        next();
    };

    middleware.isCorsMiddleware = true;
    middleware.corsOptions = opts;

    return middleware;
};

module.exports = cors;