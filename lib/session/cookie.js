'use strict';

function serialize(name, val, options) {
  const opts = options || {};
  let str = `${name}=${encodeURIComponent(val)}`;

  if (opts.maxAge != null) {
    const maxAge = opts.maxAge - 0;
    if (isNaN(maxAge) || !isFinite(maxAge)) {
      throw new TypeError('option maxAge is invalid');
    }
    str += `; Max-Age=${Math.floor(maxAge)}`;
  }

  if (opts.domain) str += `; Domain=${opts.domain}`;
  str += `; Path=${opts.path || '/'}`;

  if (opts.expires) {
    const expires = opts.expires instanceof Date ? opts.expires : new Date(opts.expires);
    if (isNaN(expires.getTime())) {
      throw new TypeError('option expires is invalid');
    }
    str += `; Expires=${expires.toUTCString()}`;
  }

  if (opts.httpOnly) str += '; HttpOnly';
  if (opts.secure) str += '; Secure';
  if (opts.partitioned) str += '; Partitioned';

  if (opts.priority) {
    const priority = typeof opts.priority === 'string' ? opts.priority.toLowerCase() : '';
    switch (priority) {
      case 'low': str += '; Priority=Low'; break;
      case 'medium': str += '; Priority=Medium'; break;
      case 'high': str += '; Priority=High'; break;
      default: throw new TypeError('option priority is invalid');
    }
  }

  if (opts.sameSite) {
    const sameSite = typeof opts.sameSite === 'string' ? opts.sameSite.toLowerCase() : opts.sameSite;
    switch (sameSite) {
      case true:
      case 'strict': str += '; SameSite=Strict'; break;
      case 'lax': str += '; SameSite=Lax'; break;
      case 'none': str += '; SameSite=None'; break;
      default: throw new TypeError('option sameSite is invalid');
    }
  }

  return str;
}

var Cookie = module.exports = function Cookie(options) {
  this.path = '/';
  this.maxAge = null;
  this.httpOnly = true;

  if (options) {
    if (typeof options !== 'object') {
      throw new TypeError('argument options must be a object');
    }

    for (var key in options) {
      if (key !== 'data') {
        this[key] = options[key];
      }
    }
  }

  if (this.originalMaxAge === undefined || this.originalMaxAge === null) {
    this.originalMaxAge = this.maxAge;
  }
};

Cookie.prototype = {

  set expires(date) {
    this._expires = date;
    this.originalMaxAge = this.maxAge;
  },

  get expires() {
    return this._expires;
  },

  set maxAge(ms) {
    if (ms && typeof ms !== 'number' && !(ms instanceof Date)) {
      throw new TypeError('maxAge must be a number or Date');
    }

    this.expires = typeof ms === 'number'
      ? new Date(Date.now() + ms)
      : ms;
  },

  get maxAge() {
    return this.expires instanceof Date
      ? this.expires.valueOf() - Date.now()
      : this.expires;
  },

  get data() {
    return {
      originalMaxAge: this.originalMaxAge,
      partitioned: this.partitioned,
      priority: this.priority,
      expires: this._expires,
      secure: this.secure,
      httpOnly: this.httpOnly,
      domain: this.domain,
      path: this.path,
      sameSite: this.sameSite
    };
  },

  serialize: function (name, val) {
    return serialize(name, val, this.data);
  },

  toJSON: function () {
    return this.data;
  }
};

module.exports.serialize = serialize;
