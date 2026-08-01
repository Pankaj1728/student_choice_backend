const pool = require('../config/db');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');

const roleQuery = `SELECT r.id,r.\`key\`,r.name,COUNT(DISTINCT u.id) AS userCount FROM roles r LEFT JOIN users u ON u.role_id=r.id GROUP BY r.id ORDER BY r.id`;
async function roleList() {
  const [roles] = await pool.query(roleQuery);
  const [maps] = await pool.query(`SELECT rp.role_id,p.id,p.\`key\`,p.name FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id ORDER BY p.name`);
  return roles.map(role => ({ ...role, userCount: Number(role.userCount), permissions: maps.filter(item => item.role_id === role.id).map(({ id, key, name }) => ({ id, key, name })) }));
}
function normaliseKey(value) { return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
async function setPermissions(roleId, permissionIds) {
  const ids = [...new Set((permissionIds || []).map(Number).filter(Number.isInteger))];
  if (ids.length) { const [rows] = await pool.query(`SELECT id FROM permissions WHERE id IN (${ids.map(() => '?').join(',')})`, ids); if (rows.length !== ids.length) throw new AppError('One or more permissions are invalid', 422); }
  await pool.execute('DELETE FROM role_permissions WHERE role_id=?', [roleId]);
  if (ids.length) await pool.query(`INSERT INTO role_permissions(role_id,permission_id) VALUES ${ids.map(() => '(?,?)').join(',')}`, ids.flatMap(id => [roleId, id]));
}
exports.list = asyncHandler(async (_req, res) => res.json({ roles: await roleList() }));
exports.permissions = asyncHandler(async (_req, res) => { const [permissions] = await pool.query('SELECT id,`key`,name FROM permissions ORDER BY name'); res.json({ permissions }); });
exports.create = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim(); const key = normaliseKey(req.body.key || name);
  if (!name || !key) throw new AppError('Role name is required', 422);
  if (key === 'super_admin') throw new AppError('The Super Admin role is system-managed', 422);
  try { const [result] = await pool.execute('INSERT INTO roles(`key`,name) VALUES (?,?)', [key, name]); await setPermissions(result.insertId, req.body.permissionIds); res.status(201).json({ role: (await roleList()).find(role => role.id === result.insertId) }); }
  catch (error) { if (error.code === 'ER_DUP_ENTRY') throw new AppError('A role with this name already exists', 409); throw error; }
});
exports.update = asyncHandler(async (req, res) => {
  const roleId = Number(req.params.id); const [rows] = await pool.execute('SELECT id,`key` FROM roles WHERE id=?', [roleId]); const role = rows[0]; if (!role) throw new AppError('Role not found', 404);
  if (role.key === 'super_admin') throw new AppError('Super Admin always has every permission and cannot be edited', 422);
  const name = String(req.body.name || '').trim(); if (!name) throw new AppError('Role name is required', 422);
  await pool.execute('UPDATE roles SET name=? WHERE id=?', [name, roleId]); await setPermissions(roleId, req.body.permissionIds);
  res.json({ role: (await roleList()).find(item => item.id === roleId) });
});
exports.remove = asyncHandler(async (req, res) => {
  const roleId = Number(req.params.id); const [rows] = await pool.execute('SELECT `key` FROM roles WHERE id=?', [roleId]); if (!rows[0]) throw new AppError('Role not found', 404);
  if (rows[0].key === 'super_admin') throw new AppError('Super Admin role cannot be deleted', 422);
  const [users] = await pool.execute('SELECT COUNT(*) AS count FROM users WHERE role_id=?', [roleId]); if (users[0].count) throw new AppError('Move users out of this role before deleting it', 422);
  await pool.execute('DELETE FROM roles WHERE id=?', [roleId]); res.json({ ok: true });
});
