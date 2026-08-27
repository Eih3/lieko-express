# Lieko Express

A modern, minimal, Express-like framework for Node.js with built-in body parsing, CORS, validation, and more. Lieko-express is designed to be a drop-in replacement for Express.js with additional features and better performance.

## Key Features

- **Express-compatible API**: Familiar routing, middleware, and request/response handling.
- **Built-in Body Parsing**: JSON, URL-encoded, and multipart form-data support.
- **CORS Support**: Configurable cross-origin resource sharing with flexible options.
- **Schema Validation**: Built-in validation system with comprehensive validators.
- **Static File Serving**: Efficient static file middleware with caching and ETags.
- **Template Engine**: Simple HTML templating with support for custom engines.
- **Route Groups**: Organize routes with nested groups and shared middleware.
- **Debug Mode**: Detailed request logging with timing and payload information.

## Installation

### NPM
```bash
npm install lieko-express
```

### Yarn
```bash
yarn add lieko-express
```

## Quick Start

Create your first Lieko-express application:

```javascript
const app = require('lieko-express')();

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### Basic REST API Example

```javascript
const app = require('lieko-express')();

// Enable debug mode
app.debug(true);

// Simple in-memory database
const users = [];
let idCounter = 1;

// Get all users
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  
  if (!user) {
    return res.status(404).json({ 
      error: 'User not found' 
    });
  }
  
  res.json(user);
});

// Create user
app.post('/api/users', (req, res) => {
  const user = {
    id: String(idCounter++),
    name: req.body.name,
    email: req.body.email,
    createdAt: new Date().toISOString()
  };
  
  users.push(user);
  res.status(201).json(user);
});

// Update user
app.patch('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  
  if (!user) {
    return res.status(404).json({ 
      error: 'User not found' 
    });
  }
  
  Object.assign(user, req.body);
  res.json(user);
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ 
      error: 'User not found' 
    });
  }
  
  users.splice(index, 1);
  res.status(204).end();
});

app.listen(3000, () => {
  console.log('API running on http://localhost:3000');
});
```

## Configuration

Customize Lieko-express with settings:

```javascript
const app = require('lieko-express')();

// Enable/disable features
app.set('x-powered-by', 'MyApp');
app.set('trust proxy', true);
app.set('views', './templates');
app.set('view engine', 'html');

// Enable debug mode
app.debug(true);

// Disable strict trailing slash
app.set('strictTrailingSlash', false);
app.set('allowTrailingSlash', true);
```

### Configuration Options

| Setting              | Type          | Default       | Description                     |
|----------------------|---------------|---------------|---------------------------------|
| `debug`             | boolean      | false        | Enable detailed request logging |
| `x-powered-by`      | string\|boolean | 'lieko-express' | X-Powered-By header value     |
| `trust proxy`       | boolean      | false        | Trust X-Forwarded-* headers     |
| `strictTrailingSlash` | boolean    | true         | Strict trailing slash matching  |
| `allowTrailingSlash` | boolean     | true         | Allow optional trailing slash   |
| `views`             | string       | './views'    | Template directory path         |
| `view engine`       | string       | 'html'       | Default template engine         |

## Routing

Define routes with flexible patterns:

```javascript
// GET request
app.get('/users', (req, res) => {
  res.json({ users: [] });
});

// POST request
app.post('/users', (req, res) => {
  res.status(201).json({ message: 'User created' });
});

// Route parameters
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.json({ userId });
});

// Multiple handlers
app.get('/protected', authMiddleware, (req, res) => {
  res.json({ message: 'Protected route' });
});
```

## Middleware

Middleware for request processing:

```javascript
// Application-level
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Error handling
app.errorHandler((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      code: err.code || 'SERVER_ERROR'
    }
  });
});
```

## Request Object

Properties and methods:

| Property          | Type    | Description                          |
|-------------------|---------|--------------------------------------|
| `req.body`       | object | Parsed request body                  |
| `req.params`     | object | Route parameters                     |
| `req.query`      | object | Query string parameters              |
| `req.files`      | object | Uploaded files                       |
| `req.headers`    | object | HTTP headers                         |
| `req.method`     | string | HTTP method                          |

Methods like `req.get('Content-Type')`, `req.accepts(['json', 'html'])`.

## Response Object

Methods for sending responses:

```javascript
// Send JSON
res.json({ message: 'Hello' });

// Status and helpers
res.status(201).json({ message: 'Created' });
res.ok({ data: users });
res.created({ user });
res.noContent();
res.badRequest('Invalid input');
res.redirect('/new-url');
```

## Body Parsing

Automatic parsing with limits:

```javascript
app.bodyParser({
  limit: '50mb',
  extended: true,
  strict: true
});
```

## CORS

Configure CORS:

```javascript
app.cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
});
```

## Static Files

Serve static files:

```javascript
app.use(app.static('public'));
```

## Template Engine

Render templates:

```javascript
res.render('index', {
  title: 'My Page',
  user: { name: 'Alice' }
});
```

## Schema Validation

Validate requests:

```javascript
const { Schema, validators: v, validate } = require('lieko-express');

const schema = new Schema({
  name: [v.required(), v.string(), v.minLength(3)],
  age: [v.optional(), v.number(), v.min(18)]
});

app.post('/users', validate(schema), (req, res) => {
  res.created(req.body);
});
```

## Route Groups

Organize routes:

```javascript
app.group('/api', (api) => {
  api.get('/users', handler);
  api.post('/users', handler);
});
```

## Error Handling

Custom handlers:

```javascript
app.notFound((req, res) => {
  res.notFound('Page not found');
});
```

## Cookies

Set and clear cookies:

```javascript
res.cookie('session', 'abc123', {
  maxAge: 86400000,
  httpOnly: true,
  secure: true
});

res.clearCookie('session');
```

## File Uploads

Handle uploads:

```javascript
app.post('/upload', (req, res) => {
  const file = req.files.avatar;
  // Process file
});
```

## API Methods Reference

See the full documentation for complete lists of application and response methods.

## Validators Reference

Built-in validators like `v.required()`, `v.email()`, `v.min(10)`.

## Best Practices

- Use modular routes and controllers.
- Handle environment variables with `dotenv`.
- Implement security headers.
- Add rate limiting for APIs.
