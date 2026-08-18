const pool = require('../config/db');

const RoleModel = {
  async findAll() {
    const [roles] = await pool.query('SELECT * FROM roles ORDER BY id ASC');
    const [permissions] = await pool.query(
      'SELECT rp.role_id, p.`key` AS permission_key FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id'
    );
    const map = new Map();
    permissions.forEach(row => {
      if (!map.has(row.role_id)) map.set(row.role_id, []);
      map.get(row.role_id).push(row.permission_key);
    });
    return roles.map(role => ({
      ...role,
      permissions: map.get(role.id) || []
    }));
  },

  async findById(id) {
    const [roles] = await pool.execute('SELECT * FROM roles WHERE id=?', [Number(id)]);
    if (!roles[0]) return null;
    const [permissions] = await pool.execute(
      'SELECT p.`key` AS permission_key FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id=?',
      [Number(id)]
    );
    return {
      ...roles[0],
      permissions: permissions.map(row => row.permission_key)
    };
  },

  async create({ name, key, description, permissions = [] }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [res] = await connection.execute(
        'INSERT INTO roles(name, `key`, description) VALUES(?, ?, ?)',
        [name, key, description]
      );
      const roleId = res.insertId;
      for (const pKey of permissions) {
        const [pRows] = await connection.execute('SELECT id FROM permissions WHERE `key`=?', [pKey]);
        if (pRows[0]) {
          await connection.execute(
            'INSERT INTO role_permissions(role_id, permission_id) VALUES(?, ?)',
            [roleId, pRows[0].id]
          );
        }
      }
      await connection.commit();
      return this.findById(roleId);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  async update(id, { name, description, permissions }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      if (name !== undefined || description !== undefined) {
        await connection.execute(
          'UPDATE roles SET name=COALESCE(?, name), description=COALESCE(?, description) WHERE id=?',
          [name || null, description || null, Number(id)]
        );
      }
      if (Array.isArray(permissions)) {
        await connection.execute('DELETE FROM role_permissions WHERE role_id=?', [Number(id)]);
        for (const pKey of permissions) {
          const [pRows] = await connection.execute('SELECT id FROM permissions WHERE `key`=?', [pKey]);
          if (pRows[0]) {
            await connection.execute(
              'INSERT INTO role_permissions(role_id, permission_id) VALUES(?, ?)',
              [Number(id), pRows[0].id]
            );
          }
        }
      }
      await connection.commit();
      return this.findById(id);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM roles WHERE id=?', [Number(id)]);
    return result.affectedRows > 0;
  }
};

module.exports = RoleModel;
