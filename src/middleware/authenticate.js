const { verifyAccessToken } = require('../utils/jwt');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization; // Expected: "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.slice(7); // strip "Bearer "
  try {
    const payload = verifyAccessToken(token);
    // Attach user info to request for later middleware/controllers
    req.user = payload; // { userId, role, email, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authenticate;