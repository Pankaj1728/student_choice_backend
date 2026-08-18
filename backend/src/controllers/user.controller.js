const bcrypt = require('bcryptjs');
const UserModel = require('../models/user.model');
const pool = require('../config/db');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');

function cleanString(v) { return String(v || '').trim(); }

exports.list = asyncHandler(async (_req, res) => {
  const users = await UserModel.findAll();
  res.json({ users });
});

exports.get = asyncHandler(async (req, res) => {
  const user = await UserModel.findById(Number(req.params.id));
  if (!user) throw new AppError('User not found', 404);
  res.json({ user });
});

exports.create = asyncHandler(async (req, res) => {
  const name = cleanString(req.body.name);
  const email = cleanString(req.body.email).toLowerCase();
  const password = String(req.body.password || '');
  const roleId = Number(req.body.roleId);
  const isActive = req.body.isActive === undefined ? 1 : (req.body.isActive ? 1 : 0);

  if (!name || !email || !password || !roleId) throw new AppError('Name, email, password, and role are required', 422);

  const [roles] = await pool.execute('SELECT id FROM roles WHERE id=?', [roleId]);
  if (!roles[0]) throw new AppError('Selected role does not exist', 422);

  const existing = await UserModel.findByEmail(email);
  if (existing) throw new AppError('Email is already registered', 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({ name, email, passwordHash, roleId, isActive });
  res.status(201).json({ user });
});

exports.update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const found = await UserModel.findById(id);
  if (!found) throw new AppError('User not found', 404);

  const name = req.body.name !== undefined ? cleanString(req.body.name) : undefined;
  const email = req.body.email !== undefined ? cleanString(req.body.email).toLowerCase() : undefined;
  const password = req.body.password ? String(req.body.password) : null;
  const roleId = req.body.roleId !== undefined ? Number(req.body.roleId) : undefined;
  const isActive = req.body.isActive !== undefined ? (req.body.isActive ? 1 : 0) : undefined;

  if (email) {
    const existing = await UserModel.findByEmail(email);
    if (existing && existing.id !== id) throw new AppError('Email is already in use', 409);
  }

  if (roleId) {
    const [roles] = await pool.execute('SELECT id FROM roles WHERE id=?', [roleId]);
    if (!roles[0]) throw new AppError('Selected role does not exist', 422);
  }

  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
  const user = await UserModel.update(id, { name, email, passwordHash, roleId, isActive });
  res.json({ user });
});

exports.remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (req.user.id === id) throw new AppError('You cannot delete your own account', 400);

  const ok = await UserModel.remove(id);
  if (!ok) throw new AppError('User not found', 404);
  res.json({ ok: true });
});
