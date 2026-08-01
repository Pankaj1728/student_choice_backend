const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');

function publicUser(user) { return { id: user.id, name: user.name, email: user.email, role: user.role, roleKey: user.role_key, permissions: user.permissions }; }
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required', 422);
  const [rows] = await pool.execute(`SELECT u.id,u.name,u.email,u.password,r.\`key\` role_key,r.name role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email=? AND u.is_active=1 LIMIT 1`, [String(email).trim().toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password))) throw new AppError('Invalid email or password', 401);
  const [permissions] = await pool.execute(`SELECT p.\`key\` FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id WHERE rp.role_id=(SELECT role_id FROM users WHERE id=?)`, [user.id]);
  user.permissions = permissions.map(p => p.key);
  const token = jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  res.json({ token, user: publicUser(user) });
});
exports.me = asyncHandler(async (req, res) => res.json({ user: publicUser(req.user) }));
