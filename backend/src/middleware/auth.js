const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');

exports.authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token) throw new AppError('Authentication required', 401);
  let payload; try { payload = jwt.verify(token, env.jwtSecret); } catch { throw new AppError('Invalid or expired session', 401); }
  const [rows] = await pool.execute(`SELECT u.id,u.name,u.email,r.\`key\` role_key,r.name role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=? AND u.is_active=1`, [payload.sub]);
  if (!rows[0]) throw new AppError('Account is unavailable', 401);
  const [permissions] = await pool.execute(`SELECT p.\`key\` FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id JOIN users u ON u.role_id=rp.role_id WHERE u.id=?`, [rows[0].id]);
  req.user = { ...rows[0], permissions: permissions.map(p => p.key) }; next();
});
exports.allow = (...permissions) => (req, _res, next) => {
  const hasAccess = permissions.some(p => req.user.permissions.includes(p));
  if (!hasAccess) return next(new AppError('You do not have access to this resource', 403));
  next();
};
