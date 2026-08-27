'use strict';

var crypto = require('crypto');
var Cookie = require('./cookie');
var MemoryStore = require('./memory');
var Session = require('./session');
var Store = require('./store');

var defer = typeof setImmediate === 'function'
  ? setImmediate
  : function (fn) { process.nextTick(fn.bind.apply(fn, arguments)); };

module.exports = session;

session.Store = Store;
session.Cookie = Cookie;
session.Session = Session;
session.MemoryStore = MemoryStore;

var warning = 'Warning: lieko-express session MemoryStore is not\n'
  + 'designed for a production environment, as it will leak\n'
  + 'memory, and will not scale past a single process.';

function sign(val, secret) {
  return val + '.' + crypto
    .createHmac('sha256', secret)
    .update(val)
    .digest('base64')
    .replace(/=+$/, '');
}

function unsign(val, secret) {
  var idx = val.lastIndexOf('.');
  if (idx < 0) return false;

  var str = val.slice(0, idx);
  var mac = sign(str, secret);

  var macBuf = crypto.createHash('sha256').update(mac).digest();
  var valBuf = crypto.createHash('sha256').update(val).digest();

  return macBuf.length === valBuf.length && crypto.timingSafeEqual(macBuf, valBuf)
    ? str
    : false;
}

function generateSessionId() {
  return crypto.randomBytes(24).toString('base64url');
}

/** Parsing Cookie header (RFC 6265). */
function parseCookieHeader(header) {
  var out = {};
  if (!header) return out;

  var pairs = header.split(';');
  for (var i = 0; i < pairs.length; i++) {
    var idx = pairs[i].indexOf('=');
    if (idx < 0) continue;

    var key = pairs[i].slice(0, idx).trim();
    if (!key || out[key] !== undefined) continue;

    var val = pairs[i].slice(idx + 1).trim();
    if (val[0] === '"') val = val.slice(1, -1);

    try {
      out[key] = decodeURIComponent(val);
    } catch (e) {
      out[key] = val;
    }
  }
  return out;
}

function onHeaders(res, listener) {
  var raw = res.writeHead;
  res.writeHead = function writeHead() {
    listener();
    return raw.apply(this, arguments);
  };
}

function hash(sess) {
  var str = JSON.stringify(sess, function (key, val) {
    if (this === sess && key === 'cookie') return undefined;
    return val;
  });

  return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
}

function session(options) {
  var opts = options || {};

  var cookieOptions = opts.cookie || {};
  var generateId = opts.genid || generateSessionId;
  var name = opts.name || opts.key || 'lieko.sid';
  var store = opts.store || new MemoryStore();
  var resaveSession = opts.resave !== undefined ? opts.resave : true;
  var rollingSessions = Boolean(opts.rolling);
  var saveUninitializedSession = opts.saveUninitialized !== undefined ? opts.saveUninitialized : true;
  var secret = opts.secret;

  if (typeof generateId !== 'function') {
    throw new TypeError('genid option must be a function');
  }

  if (opts.unset && opts.unset !== 'destroy' && opts.unset !== 'keep') {
    throw new TypeError('unset option must be "destroy" or "keep"');
  }
  var unsetDestroy = opts.unset === 'destroy';

  if (Array.isArray(secret) && secret.length === 0) {
    throw new TypeError('secret option array must contain one or more strings');
  }
  if (secret && !Array.isArray(secret)) {
    secret = [secret];
  }
  if (!secret) {
    console.warn('Warning: lieko-express session — no `secret` option provided. ' +
      'Every request will fail until one is set.');
  }

  if (process.env.NODE_ENV === 'production' && store instanceof MemoryStore) {
    console.warn(warning);
  }

  store.generate = function (req) {
    req.sessionID = generateId(req);
    req.session = new Session(req);
    req.session.cookie = new Cookie(typeof cookieOptions === 'function' ? cookieOptions(req) : cookieOptions);

    var isSecure = req.secure === true;

    if (cookieOptions.secure === 'auto') {
      req.session.cookie.secure = isSecure;
    }
    if (cookieOptions.sameSite === 'auto') {
      req.session.cookie.sameSite = isSecure ? 'none' : 'lax';
    }
  };

  var storeImplementsTouch = typeof store.touch === 'function';

  var storeReady = true;
  store.on('disconnect', function () { storeReady = false; });
  store.on('connect', function () { storeReady = true; });

  return function sessionMiddleware(req, res, next) {
    if (req.session) {
      return next();
    }

    if (!storeReady) {
      return next();
    }

    var resolvedCookieOptions = typeof cookieOptions === 'function' ? cookieOptions(req) : cookieOptions;
    var scopePath = resolvedCookieOptions.path || '/';
    if (req.path.indexOf(scopePath) !== 0) {
      return next();
    }

    if (!secret) {
      return next(new Error('secret option required for sessions'));
    }
    var secrets = secret;

    var originalHash;
    var originalId;
    var savedHash;
    var touched = false;

    req.sessionStore = store;

    var cookieId = req.sessionID = getcookie(req, name, secrets);

    onHeaders(res, function () {
      if (!req.session) return;
      if (!shouldSetCookie(req)) return;

      if (req.session.cookie.secure && req.secure !== true) return;

      if (!touched) {
        req.session.touch();
        touched = true;
      }

      try {
        setcookie(res, name, req.sessionID, secrets[0], req.session.cookie.data);
      } catch (err) {
        defer(next, err);
      }
    });

    var _end = res.end.bind(res);
    var ended = false;

    res.end = function end(chunk, encoding, cb) {
      if (ended) return res;
      ended = true;

      function finish() {
        return _end(chunk, encoding, cb);
      }

      if (shouldDestroy(req)) {
        store.destroy(req.sessionID, function (err) {
          if (err) defer(next, err);
          finish();
        });
        return res;
      }

      if (!req.session) {
        return finish();
      }

      if (!touched) {
        req.session.touch();
        touched = true;
      }

      if (shouldSave(req)) {
        req.session.save(function (err) {
          if (err) defer(next, err);
          finish();
        });
        return res;
      }

      if (storeImplementsTouch && shouldTouch(req)) {
        store.touch(req.sessionID, req.session, function (err) {
          if (err) defer(next, err);
          finish();
        });
        return res;
      }

      return finish();
    };

    function generate() {
      store.generate(req);
      originalId = req.sessionID;
      originalHash = hash(req.session);
      wrapmethods(req.session);
    }

    function inflate(req, sess) {
      store.createSession(req, sess);
      originalId = req.sessionID;
      originalHash = hash(sess);

      if (!resaveSession) {
        savedHash = originalHash;
      }

      wrapmethods(req.session);
    }

    function rewrapmethods(sess, callback) {
      return function () {
        if (req.session !== sess) wrapmethods(req.session);
        callback.apply(this, arguments);
      };
    }

    function wrapmethods(sess) {
      var _reload = sess.reload;
      var _save = sess.save;

      Object.defineProperty(sess, 'reload', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function reload(callback) {
          _reload.call(this, rewrapmethods(this, callback));
        }
      });

      Object.defineProperty(sess, 'save', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function save() {
          savedHash = hash(this);
          _save.apply(this, arguments);
        }
      });
    }

    function isModified(sess) {
      return originalId !== sess.id || originalHash !== hash(sess);
    }

    function isSaved(sess) {
      return originalId === sess.id && savedHash === hash(sess);
    }

    function shouldDestroy(req) {
      return req.sessionID && unsetDestroy && req.session == null;
    }

    function shouldSave(req) {
      if (typeof req.sessionID !== 'string') return false;

      return !saveUninitializedSession && !savedHash && cookieId !== req.sessionID
        ? isModified(req.session)
        : !isSaved(req.session);
    }

    function shouldTouch(req) {
      if (typeof req.sessionID !== 'string') return false;
      return cookieId === req.sessionID && !shouldSave(req);
    }

    function shouldSetCookie(req) {
      if (typeof req.sessionID !== 'string') return false;

      return cookieId !== req.sessionID
        ? saveUninitializedSession || isModified(req.session)
        : rollingSessions || (req.session.cookie.expires != null && isModified(req.session));
    }

    if (!req.sessionID) {
      generate();
      return next();
    }

    store.get(req.sessionID, function (err, sess) {
      if (err && err.code !== 'ENOENT') {
        return next(err);
      }

      try {
        if (err || !sess) {
          generate();
        } else {
          inflate(req, sess);
        }
      } catch (e) {
        return next(e);
      }

      next();
    });
  };
}

function getcookie(req, name, secrets) {
  var header = req.headers.cookie;
  if (!header) return;

  var raw = parseCookieHeader(header)[name];
  if (!raw) return;

  if (raw.slice(0, 2) !== 's:') return;

  for (var i = 0; i < secrets.length; i++) {
    var val = unsign(raw.slice(2), secrets[i]);
    if (val !== false) return val;
  }
}

function setcookie(res, name, val, secret, options) {
  var signed = 's:' + sign(val, secret);
  var data = Cookie.serialize(name, signed, options);

  var prev = res.getHeader('Set-Cookie') || [];
  var header = Array.isArray(prev) ? prev.concat(data) : [prev, data];

  res.setHeader('Set-Cookie', header);
}
