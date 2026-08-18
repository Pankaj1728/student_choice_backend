const RoleModel = require('../models/role.model');
const pool = require('../config/db');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');

const AVAILABLE_PERMISSIONS = [
  'dashboard.view',
  'calling.view', 'calling.manage',
  'leads.view', 'leads.manage',
  'followup.view', 'followup.manage',
  'reports.view',
  'users.manage'
];

function cleanString(value) { return String(value || '').trim(); }

exports.list = asyncHandler(async (_req, res) => {
  const roles = await RoleModel.findAll();
  res.json({ roles, availablePermissions: AVAILABLE_PERMISSIONS });
});

exports.permissions = asyncHandler(async (_req, res) => {
  res.json({ permissions: AVAILABLE_PERMISSIONS });
});

exports.get = asyncHandler(async (req, res) => {
  const role = await RoleModel.findById(Number(req.params.id));
  if (!role) throw new AppError('Role not found', 404);
  res.json({ role, availablePermissions: AVAILABLE_PERMISSIONS });
});

exports.create = asyncHandler(async (req, res) => {
  const name = cleanString(req.body.name);
  const key = cleanString(req.body.key).toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const description = cleanString(req.body.description);
  const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];

  if (!name || !key) throw new AppError('Role name and key are required', 422);

  const [existing] = await pool.execute('SELECT id FROM roles WHERE `key`=?', [key]);
  if (existing[0]) throw new AppError('Role key already exists', 409);

  const invalidPerm = permissions.find(p => !AVAILABLE_PERMISSIONS.includes(p));
  if (invalidPerm) throw new AppError(`Invalid permission key: ${invalidPerm}`, 422);

  const role = await RoleModel.create({ name, key, description, permissions });
  res.status(201).json({ role });
});

exports.update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await RoleModel.findById(id);
  if (!existing) throw new AppError('Role not found', 404);

  const name = req.body.name !== undefined ? cleanString(req.body.name) : undefined;
  const description = req.body.description !== undefined ? cleanString(req.body.description) : undefined;
  const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : undefined;

  if (permissions) {
    const invalidPerm = permissions.find(p => !AVAILABLE_PERMISSIONS.includes(p));
    if (invalidPerm) throw new AppError(`Invalid permission key: ${invalidPerm}`, 422);
  }

  const role = await RoleModel.update(id, { name, description, permissions });
  res.json({ role });
});

exports.remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const role = await RoleModel.findById(id);
  if (!role) throw new AppError('Role not found', 404);
  if (role.key === 'super_admin') throw new AppError('Cannot delete super_admin role', 400);

  const [users] = await pool.execute('SELECT id FROM users WHERE role_id=? LIMIT 1', [id]);
  if (users[0]) throw new AppError('Cannot delete role assigned to active users', 400);

  const ok = await RoleModel.remove(id);
  if (!ok) throw new AppError('Role not found', 404);
  res.json({ ok: true });
});
