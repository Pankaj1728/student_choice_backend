const pool = require('../config/db');

const userCols = `u.id,u.name,u.email,u.role_id,u.is_active,u.created_at,u.updated_at,r.name AS role_name,r.key AS role_key`;

const UserModel = {
  async findByEmail(email) {
    const [rows] = await pool.execute(
      `SELECT u.*,r.name AS role_name,r.key AS role_key FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.email=?`,
      [email]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT ${userCols} FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=?`,
      [Number(id)]
    );
    return rows[0] || null;
  },

  async findAll() {
    const [rows] = await pool.query(
      `SELECT ${userCols} FROM users u LEFT JOIN roles r ON r.id=u.role_id ORDER BY u.created_at DESC`
    );
    return rows;
  },

  async create({ name, email, passwordHash, roleId, isActive = 1 }) {
    const [result] = await pool.execute(
      `INSERT INTO users(name,email,password,role_id,is_active) VALUES(?,?,?,?,?)`,
      [name, email, passwordHash, roleId, isActive]
    );
    return this.findById(result.insertId);
  },

  async update(id, { name, email, passwordHash, roleId, isActive }) {
    const fields = [];
    const values = [];

    if (name !== undefined) { fields.push('name=?'); values.push(name); }
    if (email !== undefined) { fields.push('email=?'); values.push(email); }
    if (passwordHash) { fields.push('password=?'); values.push(passwordHash); }
    if (roleId !== undefined) { fields.push('role_id=?'); values.push(roleId); }
    if (isActive !== undefined) { fields.push('is_active=?'); values.push(isActive); }

    if (fields.length) {
      values.push(Number(id));
      await pool.execute(`UPDATE users SET ${fields.join(',')} WHERE id=?`, values);
    }
    return this.findById(id);
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM users WHERE id=?', [Number(id)]);
    return result.affectedRows > 0;
  }
};

module.exports = UserModel;
