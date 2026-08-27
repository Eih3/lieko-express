# lieko-express

A modern, minimal, Express-like framework for Node.js with built-in body parsing, CORS, validation, and more. Lieko-express is designed to be a drop-in replacement for Express.js with additional features and better performance.

## Key Features

- **Familiar Express-like API** — routing, middleware, groups, `req`/`res` helpers
- **Built-in body parsing** — JSON, URL-encoded, and multipart/form-data, no external dependency
- **Built-in CORS middleware** — wildcard, array, and regex origin matching, private network support
- **Schema-based validation** — chainable validators with `validate()` / `validatePartial()` middleware
- **Route groups** — shared middleware, nested groups, array paths
- **Static file serving** — ETag, `Last-Modified`, Range requests, caching headers
- **View engine support** — built-in HTML engine (`{{safe}}` / `{{{unsafe}}}` interpolation), pluggable via `app.engine()`
- **Session management** — Express-session-compatible API with signed cookies and pluggable stores
- **Direct server access** — mount your own `http.Server` (e.g. to attach a WebSocket server)
- **Zero external dependencies**
- **Debug mode** — colored, structured request logging

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Application Settings](#application-settings)
- [Routing](#routing)
- [Route Groups](#route-groups)
- [Middleware](#middleware)
- [Request Object](#request-object)
- [Response Object](#response-object)
- [Body Parsing](#body-parsing)
- [CORS](#cors)
- [Static Files](#static-files)
- [View Engine](#view-engine)
- [Schema Validation](#schema-validation)
- [Sessions](#sessions)
- [Error Handling](#error-handling)
- [Debug Mode](#debug-mode)
- [Raw Server & WebSockets](#raw-server--websockets)
- [Utilities](#utilities)

## Introduction

lieko-express is a lightweight HTTP framework for Node.js, built directly on top of the native `http` module. It follows the Express.js API shape you already know — `app.get()`, `app.use()`, `req`/`res` helpers, middleware chains — while bundling body parsing, CORS, schema validation, static file serving, a minimal view engine, and Express-session-compatible sessions, all with zero external dependencies.

> **Note:** lieko-express is not a fork of Express — it's a from-scratch implementation designed to feel familiar while trimming dependencies and adding a few conveniences (response helpers like `res.ok()`, native support for the `QUERY` HTTP method, built-in schema validation, etc.).

## Installation

### NPM

```bash
npm install lieko-express
```

### Yarn

```bash
yarn add lieko-express
```

### Basic Usage

```javascript
const Lieko = require('lieko-express');

const app = new Lieko();

app.get('/', (req, res) => {
    res.send('Hello from lieko-express!');
});

app.listen(3000, () => {
    console.log(`Server running on http://localhost:3000`);
});
```

## Quick Start

```javascript
const Lieko = require('lieko-express');

const app = new Lieko();

app.debug(true);
app.bodyParser({ limit: '5mb' });
app.cors({ origin: '*' });

app.get('/', (req, res) => {
    const routes = app.listRoutes();
    res.ok(routes);
});

app.get('/users/:id', (req, res) => {
    res.ok({ id: req.params.id, name: 'Alice' });
});

app.post('/users', (req, res) => {
    res.created(req.body);
});

app.listen(3000, () => {
    console.log(`Server running on http://localhost:3000`);
});
```

## Application Settings

lieko-express uses an Express-like settings store (`app.set()`, `app.get()`, `app.enable()`, `app.disable()`, `app.enabled()`, `app.disabled()`).

```javascript
const app = new Lieko();

app.set('trust proxy', true);
app.set('views', './views');
app.set('view engine', 'html');

app.enable('strictTrailingSlash');
app.disable('allowTrailingSlash');

app.debug(true); // shorthand for app.set('debug', true)
```

| Setting | Default | Description |
|---|---|---|
| `debug` | `false` | Enables colored request logging (see [Debug Mode](#debug-mode)) |
| `trust proxy` | `false` | Enables trusting `X-Forwarded-For` / `X-Forwarded-Proto` from `loopback`, a string IP, an array, or a custom function |
| `strictTrailingSlash` | `true` | Reserved for strict trailing-slash matching |
| `allowTrailingSlash` | `true` | Whether a static route also matches with a trailing slash |
| `views` | `./views` | Views directory (or array of directories) used by `res.render()` |
| `view engine` | `'html'` | Default extension used by `res.render()` when none is given |
| `x-powered-by` | `'lieko-express'` | Value of the `X-Powered-By` header; set to `false` to disable it |

## Routing

Routes are declared the same way as in Express, including `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `ALL`, and the additional `QUERY` method (`GET`-like semantics with a request body).

```javascript
app.get('/products', (req, res) => res.ok(products));
app.get('/products/:id', (req, res) => res.ok(findProduct(req.params.id)));
app.post('/products', (req, res) => res.created(req.body));
app.put('/products/:id', (req, res) => res.ok(updateProduct(req.params.id, req.body)));
app.patch('/products/:id', (req, res) => res.ok(patchProduct(req.params.id, req.body)));
app.delete('/products/:id', (req, res) => res.noContent());
app.query('/products/search', (req, res) => res.ok(search(req.body)));
app.all('/health', (req, res) => res.send('OK'));
```

- Route params use the `:name` syntax and are exposed on `req.params`.
- A single path can be an array: `app.get(['/a', '/b'], handler)`.
- Multiple handlers per route are supported — every handler except the last is treated as route-level middleware: `app.get('/admin', auth, adminOnly, handler)`.

### 404 & Not Found

```javascript
app.notFound((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
```

### Listing Routes

```javascript
app.listRoutes();   // returns [{ method, path, middlewares }]
app.printRoutes();  // pretty-prints the registered routes to the console
```

## Route Groups

`app.group()` mounts a set of routes under a shared base path and shared middleware, and can be nested.

```javascript
app.group('/api/v1', authMiddleware, (api) => {
    api.get('/users', listUsers);
    api.post('/users', createUser);

    api.group('/admin', requireAdmin, (admin) => {
        admin.get('/stats', getStats);
    });
});
```

## Middleware

Middleware is registered with `app.use()` and supports the same call shapes as Express: global, path-scoped, single or multiple functions, and sub-routers created with `Lieko.Router()`.

```javascript
const Lieko = require('lieko-express');
const app = new Lieko();
const router = Lieko.Router();

app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

app.use('/admin', authMiddleware);

router.get('/ping', (req, res) => res.send('pong'));
app.use('/api', router);
```

> Middleware without a `next` parameter (for non-`async` functions) logs a console warning pointing to the file and line where it was defined, to help catch requests that would otherwise hang.

## Request Object

`req` extends the native Node.js request with:

| Property / Method | Description |
|---|---|
| `req.params` | Route parameters (`:id` → `req.params.id`) |
| `req.query` | Parsed query string, with automatic `boolean`/`number` coercion |
| `req.body` | Parsed request body (see [Body Parsing](#body-parsing)) |
| `req.files` | Uploaded files from `multipart/form-data` |
| `req.ip` / `req.ips` | Resolved client IP (honors `trust proxy`) and the full forwarded chain |
| `req.protocol` / `req.secure` | Resolved protocol (`http`/`https`) and whether the request is secure |
| `req.hostname` / `req.subdomains` | Parsed `Host` header |
| `req.path` / `req.originalUrl` | Path without query string / full original URL |
| `req.xhr` | `true` if `X-Requested-With: XMLHttpRequest` |
| `req.get(name)` / `req.header(name)` | Case-insensitive header lookup |
| `req.is(type)` | Checks the request's `Content-Type` (`'json'`, `'urlencoded'`, `'multipart'`, or a MIME type) |
| `req.accepts(types)` | Content negotiation against the `Accept` header |
| `req.acceptsLanguages()` / `req.acceptsEncodings()` / `req.acceptsCharsets()` | Negotiation for the other `Accept-*` headers |
| `req.responseType()` | Heuristic (`Accept` header + user agent) returning `'json'` or `'html'` |
| `req.bearer` | Bearer token extracted from the `Authorization` header, or `null` |
| `req.app` | Reference to the application instance |

## Response Object

`res` extends the native Node.js response with Express-style and additional convenience helpers, all chainable.

```javascript
res.status(201).json({ ok: true });
res.send('plain text or object');
res.html('<h1>Hello</h1>');
res.type('application/pdf');
res.set('X-Custom', 'value');
res.cookie('token', 'abc', { httpOnly: true, maxAge: 3600000 });
res.clearCookie('token');
res.redirect('/login');
```

### API response helpers

```javascript
res.ok(data, message);            // 200 { data, message? }
res.created(data, message);       // 201 { data, message }
res.accepted(data, message);      // 202 { data, message }
res.noContent();                  // 204
res.paginated(items, total);      // 200 { data, message, pagination: { page, limit, total, totalPages, hasNext, hasPrev } }

res.badRequest('INVALID_INPUT');  // 400
res.unauthorized();               // 401
res.forbidden();                  // 403
res.notFound();                   // 404
res.serverError();                // 500
res.error({ code: 'CUSTOM_ERROR', message: 'Something went wrong' });
```

### Serving files

```javascript
res.sendFile('/absolute/path/to/file.pdf');

res.sendFile('report.pdf', {
    root: './files',
    maxAge: 3600,
    dotfiles: 'ignore' // 'allow' | 'deny' | 'ignore'
});
```

`res.sendFile()` supports HTTP Range requests (partial content, `206`), sets `ETag`/`Last-Modified`-friendly headers, blocks path traversal outside `root`, and reports readable errors in debug mode.

## Body Parsing

JSON, URL-encoded, and `multipart/form-data` bodies are parsed automatically based on `Content-Type` — no need to register middleware manually, though limits can be configured globally or per-route.

```javascript
app.bodyParser({ limit: '10mb' });   // applies to json + urlencoded + multipart
app.json({ limit: '2mb', strict: true });
app.urlencoded({ extended: true });
app.multipart({ limit: '25mb' });
```

- Values in `application/x-www-form-urlencoded` and `multipart/form-data` bodies are auto-coerced (`"true"`/`"false"` → boolean, numeric strings → number).
- Oversized bodies are rejected mid-stream with `413 PAYLOAD_TOO_LARGE` before being buffered in full.
- Malformed JSON bodies return `400 INVALID_JSON` instead of throwing.
- Uploaded files are exposed on `req.files[field]` as `{ filename, data, size, contentType }`.

## CORS

```javascript
app.cors({
    origin: ['https://example.com', '*.example.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    headers: ['Content-Type', 'Authorization'],
    maxAge: 86400
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `origin` | string \| string[] \| `'*'` | `'*'` | Allowed origin(s); supports `*` wildcards inside a domain |
| `strictOrigin` | boolean | `false` | Reject the request with `403` if the origin doesn't match |
| `credentials` | boolean | `false` | Sets `Access-Control-Allow-Credentials` |
| `allowPrivateNetwork` | boolean | `false` | Responds to `Access-Control-Request-Private-Network` |
| `methods` | string[] | all common verbs | Allowed methods on preflight |
| `headers` | string[] | `['Content-Type', 'Authorization']` | Allowed headers on preflight |
| `exposedHeaders` | string[] | `[]` | Headers exposed to the browser |
| `maxAge` | number | `86400` | Preflight cache duration (seconds) |
| `debug` | boolean | `false` | Logs the resolved CORS policy per request |

CORS can also be scoped to a single route by passing the middleware returned by `app.cors()`, or imported standalone via `require('lieko-express').cors`.

## Static Files

```javascript
app.use(app.static('./public', {
    maxAge: 3600,
    index: 'index.html',
    dotfiles: 'ignore',
    extensions: ['html'],
    immutable: false
}));
```

Serves files with `ETag` and `Last-Modified` support (`304 Not Modified` on match), directory index resolution, optional extension fallback, and safe path resolution that rejects requests escaping the configured root.

## View Engine

A minimal HTML engine ships out of the box, using `{{variable}}` (HTML-escaped) and `{{{variable}}}` (raw) interpolation.

```javascript
app.set('views', './views');
app.set('view engine', 'html');

app.get('/', (req, res) => {
    res.render('index', { title: 'Welcome', bio: userSuppliedBio });
});
```

Register your own engine for any extension (EJS, Pug, Handlebars, etc.):

```javascript
app.engine('ejs', (filePath, locals, callback) => {
    // render filePath with locals, then:
    callback(null, renderedHtml);
});
```

## Schema Validation

```javascript
const { schema, v, validate, validatePartial } = require('lieko-express');

const userSchema = schema({
    email: [v.required(), v.string(), v.email()],
    age: [v.optional(), v.number(), v.min(18)],
    role: [v.required(), v.oneOf(['admin', 'user'])]
});

app.post('/users', validate(userSchema), (req, res) => {
    res.created(req.body);
});

app.patch('/users/:id', validate(validatePartial(userSchema)), (req, res) => {
    res.ok(req.body);
});
```

On failure, `validate()` responds `400` with `{ error: { status, type: 'VALIDATION_ERROR', message, details } }`. `validatePartial()` derives a schema where every field becomes optional (useful for `PATCH`).

### Available validators

`required`, `requiredTrue` / `mustBeTrue`, `mustBeFalse`, `optional`, `string`, `number`, `boolean`, `integer`, `positive`, `negative`, `email`, `min`, `max`, `length`, `minLength`, `maxLength`, `pattern`, `oneOf`, `notOneOf`, `equal`, `date`, `before`, `after`, `startsWith`, `endsWith`, `custom(fn, message)`.

## Sessions

An Express-session-compatible implementation with signed, HMAC-verified cookies and a pluggable store interface (an in-memory store is included).

```javascript
const Lieko = require('lieko-express');
const session = Lieko.Session();

app.use(session({
    secret: 'change-me',
    name: 'lieko.sid',
    resave: false,
    saveUninitialized: false,
    rolling: false,
    cookie: { secure: 'auto', sameSite: 'auto', maxAge: 86400000 }
}));

app.get('/login', (req, res) => {
    req.session.userId = 42;
    res.ok({ loggedIn: true });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.noContent());
});
```

> By default, the bundled `MemoryStore` is not meant for production — it leaks memory and doesn't scale past a single process. Provide your own `store` implementing the `Store` interface (`get`, `set`, `destroy`, `touch`, `all`, `length`, `clear`) for production use.

## Error Handling

```javascript
app.errorHandler((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        error: { message: err.message, status: err.status || 500 }
    });
});
```

Multiple error handlers can be registered and are run in order via `next(err)`. If none are registered, unhandled errors fall back to a `500 Internal Server Error` JSON response.

## Debug Mode

```javascript
app.debug(true);
```

Logs each request's status, method, path, IP, duration, params, query, body (truncated), and uploaded file names, with color-coded status codes.

## Raw Server & WebSockets

```javascript
const http = require('http');
const { WebSocketServer } = require('ws');

const app = new Lieko();
app.get('/', (req, res) => res.send('OK'));

const server = http.createServer(app.handler);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    ws.on('message', (msg) => ws.send(`echo: ${msg}`));
});

server.listen(3000);
```

`app.handler` exposes the internal request handler so lieko-express can be mounted on any `http.Server`, the same pattern used with Express — `app.listen()` remains available as a shortcut when you don't need a custom server.

## Utilities

```javascript
app.excludeUrl(['/favicon.ico', '/.well-known/*']); // matched requests get an immediate 404, e.g. to silence noisy probes
```

---

**lieko-express** — Familiar. Lightweight. Zero dependencies. ⚡