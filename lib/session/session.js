'use strict';

module.exports = Session;

function Session(req, data) {
  Object.defineProperty(this, 'req', { value: req });
  Object.defineProperty(this, 'id', { value: req.sessionID });

  if (typeof data === 'object' && data !== null) {
    for (var prop in data) {
      if (!(prop in this)) {
        this[prop] = data[prop];
      }
    }
  }
}

defineMethod(Session.prototype, 'touch', function touch() {
  return this.resetMaxAge();
});

defineMethod(Session.prototype, 'resetMaxAge', function resetMaxAge() {
  this.cookie.maxAge = this.cookie.originalMaxAge;
  return this;
});

defineMethod(Session.prototype, 'save', function save(fn) {
  this.req.sessionStore.set(this.id, this, fn || function () { });
  return this;
});

defineMethod(Session.prototype, 'reload', function reload(fn) {
  var req = this.req;
  var store = this.req.sessionStore;

  store.get(this.id, function (err, sess) {
    if (err) return fn(err);
    if (!sess) return fn(new Error('failed to load session'));
    store.createSession(req, sess);
    fn();
  });
  return this;
});

defineMethod(Session.prototype, 'destroy', function destroy(fn) {
  delete this.req.session;
  this.req.sessionStore.destroy(this.id, fn);
  return this;
});

defineMethod(Session.prototype, 'regenerate', function regenerate(fn) {
  this.req.sessionStore.regenerate(this.req, fn);
  return this;
});

function defineMethod(obj, name, fn) {
  Object.defineProperty(obj, name, {
    configurable: true,
    enumerable: false,
    value: fn,
    writable: true
  });
}
