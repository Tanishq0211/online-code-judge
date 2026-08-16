const jwt = require('jsonwebtoken');
const { JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN,
        JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN } = process.env;

function signAccessToken(payload) {
  const payloadCopy = { ...payload };
  if (typeof payloadCopy.userId === 'bigint') {
    payloadCopy.userId = payloadCopy.userId.toString();
  }
  return jwt.sign(payloadCopy, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  });
}

function signRefreshToken(payload) {
  const payloadCopy = { ...payload };
  if (typeof payloadCopy.userId === 'bigint') {
    payloadCopy.userId = payloadCopy.userId.toString();
  }
  return jwt.sign(payloadCopy, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};