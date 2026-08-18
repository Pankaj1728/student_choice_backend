const pool = require('../config/db');

const cols = `c.id,c.lead_id,c.customer_name,c.phone,c.status,c.notes,c.follow_up_at,c.last_called_at,c.call_count,c.assigned_to,c.created_at,c.updated_at,u.name assigned_to_name,l.name lead_name`;
const trim = value => String(value || '').trim();

const CallModel = {
  async findAll({ page = 1, limit = 10, search = '', status = '', assignedTo = null, user = {} }) {
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];

    if (search) {
      const t = `%${trim(search)}%`;
      where.push('(c.customer_name LIKE ? OR c.phone LIKE ? OR l.name LIKE ?)');
      values.push(t, t, t);
    }
    if (status) {
      if (status === 'completed_all' || status === 'not_pending') {
        where.push("c.status != 'pending'");
      } else {
        where.push('c.status=?');
        values.push(status);
      }
    }
    if (assignedTo) {
      const targetId = assignedTo === 'me' ? user.id : Number(assignedTo);
      where.push('c.assigned_to=?');
      values.push(targetId);
    } else if (user.role_key === 'loan_advisor') {
      where.push('c.assigned_to=?');
      values.push(user.id);
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [calls] = await pool.query(
      `SELECT ${cols} FROM calls c LEFT JOIN users u ON u.id=c.assigned_to LEFT JOIN leads l ON l.id=c.lead_id ${clause} ORDER BY CASE WHEN c.status='pending' THEN 0 WHEN c.status='follow_up' THEN 1 ELSE 2 END,c.updated_at DESC,c.created_at DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );
    const [count] = await pool.query(`SELECT COUNT(*) total FROM calls c LEFT JOIN leads l ON l.id=c.lead_id ${clause}`, values);

    return {
      calls,
      total: Number(count[0].total)
    };
  },

  async findById(id) {
    const [rows] = await pool.execute(`SELECT ${cols} FROM calls c LEFT JOIN users u ON u.id=c.assigned_to LEFT JOIN leads l ON l.id=c.lead_id WHERE c.id=?`, [Number(id)]);
    return rows[0] || null;
  },

  async stats(assignedTo, user) {
    let clause = '';
    const values = [];
    if (assignedTo === 'me' || user.role_key === 'loan_advisor') {
      clause = 'WHERE assigned_to=?';
      values.push(user.id);
    }
    const [rows] = await pool.query(`SELECT status,COUNT(*) count FROM calls ${clause} GROUP BY status`, values);
    const total = rows.reduce((sum, row) => sum + Number(row.count), 0);
    const map = Object.fromEntries(rows.map(row => [row.status, Number(row.count)]));
    return {
      total,
      pending: map.pending || 0,
      followUps: map.follow_up || 0,
      completed: (map.completed || 0) + (map.connected || 0) + (map.interested || 0),
      notAnswered: map.not_answered || 0
    };
  },

  async create(item) {
    const [result] = await pool.execute(
      'INSERT INTO calls(lead_id,customer_name,phone,status,notes,follow_up_at,assigned_to) VALUES(?,?,?,?,?,?,?)',
      [
        item.leadId ?? null,
        item.customerName || '',
        item.phone || '',
        item.status || 'pending',
        item.notes || '',
        item.followUpAt ?? null,
        item.assignedTo ?? null
      ]
    );
    return this.findById(result.insertId);
  },

  async update(id, item, wasCalled) {
    await pool.execute(
      'UPDATE calls SET lead_id=?,customer_name=?,phone=?,status=?,notes=?,follow_up_at=?,assigned_to=?,last_called_at=IF(?,NOW(),last_called_at),call_count=call_count+IF(?,1,0) WHERE id=?',
      [
        item.leadId ?? null,
        item.customerName || '',
        item.phone || '',
        item.status || 'pending',
        item.notes || '',
        item.followUpAt ?? null,
        item.assignedTo ?? null,
        wasCalled,
        wasCalled,
        id
      ]
    );
    return this.findById(id);
  },

  async convertToLead(callId, leadData, finalAssignee) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        'INSERT INTO leads(name,phone,email,country,university,loan_amount,student_name,co_applicant,occupation,source,remarks,login_city,sanction_city,credit_score,entrance_exam,status,assigned_to) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [
          leadData.name || '',
          leadData.phone || '',
          leadData.email || '',
          leadData.country || '',
          leadData.university || '',
          leadData.loanAmount || 0,
          leadData.studentName || '',
          leadData.coApplicant || '',
          leadData.occupation || '',
          leadData.source || 'Direct',
          leadData.remarks || '',
          leadData.loginCity || '',
          leadData.sanctionCity || '',
          leadData.creditScore ?? null,
          leadData.entranceExam || '',
          leadData.status || 'new',
          finalAssignee ?? null
        ]
      );
      await connection.execute(
        'UPDATE calls SET lead_id=?,customer_name=?,phone=?,status=?,notes=?,last_called_at=NOW(),call_count=call_count+1 WHERE id=?',
        [result.insertId, leadData.name, leadData.phone, 'interested', leadData.remarks || '', callId]
      );
      await connection.commit();
      const [leads] = await pool.execute('SELECT l.*,u.name assigned_to_name FROM leads l LEFT JOIN users u ON u.id=l.assigned_to WHERE l.id=?', [result.insertId]);
      return leads[0];
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM calls WHERE id=?', [Number(id)]);
    return result.affectedRows > 0;
  }
};

module.exports = CallModel;
