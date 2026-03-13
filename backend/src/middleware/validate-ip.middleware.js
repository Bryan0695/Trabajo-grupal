'use strict';

function injectClientIp(req, res, next) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    '127.0.0.1';

  req.body.clientIp = ip === '::1' ? '127.0.0.1' : ip;

  next();
}

module.exports = { injectClientIp };
