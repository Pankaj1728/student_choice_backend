const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const pool = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');

exports.login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) throw new AppError('Email and password are required', 422);

  const user = await UserModel.findByEmail(email);
  if (!user || !user.is_active) throw new AppError('Invalid email or password', 401);

  const hash = user.password || user.password_hash;
  if (!hash) throw new AppError('Invalid email or password', 401);

  const match = await bcrypt.compare(password, hash);
  if (!match) throw new AppError('Invalid email or password', 401);

  const [roleRows] = await pool.execute(
    'SELECT p.`key` FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id WHERE rp.role_id=?',
    [user.role_id]
  );
  const permissions = roleRows.map(row => row.key);
  const token = jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role_name,
      roleKey: user.role_key,
      permissions
    }
  });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await UserModel.findById(req.user.id);
  if (!user || !user.is_active) throw new AppError('User account not found or inactive', 404);

  const [roleRows] = await pool.execute(
    'SELECT p.`key` FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id WHERE rp.role_id=?',
    [user.role_id]
  );
  const permissions = roleRows.map(row => row.key);

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role_name,
      roleKey: user.role_key,
      permissions
    }
  });
});
