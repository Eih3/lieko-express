'use strict';

var Cookie = require('./cookie');
var EventEmitter = require('events').EventEmitter;
var Session = require('./session');
var util = require('util');

module.exports = Store;

function Store() {
  EventEmitter.call(this);
}

util.inherits(Store, EventEmitter);

Store.prototype.regenerate = function (req, fn) {
  var self = this;
  this.destroy(req.sessionID, function (err) {
    self.generate(req);
    fn(err);
  });
};

Store.prototype.load = function (sid, fn) {
  var self = this;
  this.get(sid, function (err, sess) {
    if (err) return fn(err);
    if (!sess) return fn();
    var req = { sessionID: sid, sessionStore: self };
    fn(null, self.createSession(req, sess));
  });
};

Store.prototype.createSession = function (req, sess) {
  var expires = sess.cookie.expires;
  var originalMaxAge = sess.cookie.originalMaxAge;

  sess.cookie = new Cookie(sess.cookie);

  if (typeof expires === 'string') {
    sess.cookie.expires = new Date(expires);
  }

  sess.cookie.originalMaxAge = originalMaxAge;

  req.session = new Session(req, sess);
  return req.session;
};
