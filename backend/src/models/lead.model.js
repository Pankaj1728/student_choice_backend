const pool = require('../config/db');

const leadColumns = `l.id,l.name,l.phone,l.email,l.country,l.university,l.loan_amount,l.student_name,l.co_applicant,l.occupation,l.source,l.remarks,l.login_city,l.sanction_city,l.credit_score,l.entrance_exam,l.status,l.assigned_to,l.created_at,l.updated_at,u.name AS assigned_to_name`;

const LeadModel = {
  async syncModules(leadId, status) {
    if (!leadId) return;
    if (status === 'file_update') {
      await pool.execute('INSERT IGNORE INTO file_updates (lead_id) VALUES (?)', [leadId]).catch(() => {});
    }
    if (status === 'sanction') {
      const [existing] = await pool.execute('SELECT id FROM sanction_files WHERE lead_id=?', [leadId]).catch(() => [[]]);
      if (!existing || existing.length === 0) {
        await pool.execute('INSERT INTO sanction_files (lead_id) VALUES (?)', [leadId]).catch(() => {});
      }
    }
    if (status === 'pf_paid') {
      await pool.execute('INSERT IGNORE INTO pf_updates (lead_id) VALUES (?)', [leadId]).catch(() => {});
    }
  },

  async findAll({ page = 1, limit = 10, search = '', status = '', source = '', assignedTo = null }) {
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];

    if (search) {
      const term = `%${String(search).trim()}%`;
      where.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.university LIKE ? OR l.entrance_exam LIKE ?)');
      values.push(term, term, term, term, term);
    }
    if (status) { where.push('l.status=?'); values.push(status); }
    if (source) { where.push('l.source=?'); values.push(source); }
    if (assignedTo) { where.push('l.assigned_to=?'); values.push(Number(assignedTo)); }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [leads] = await pool.query(
      `SELECT ${leadColumns} FROM leads l LEFT JOIN users u ON u.id=l.assigned_to ${clause} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );
    const [counts] = await pool.query(`SELECT COUNT(*) AS total FROM leads l ${clause}`, values);

    return {
      leads,
      total: Number(counts[0].total)
    };
  },

  async findById(id) {
    const [rows] = await pool.execute(`SELECT ${leadColumns} FROM leads l LEFT JOIN users u ON u.id=l.assigned_to WHERE l.id=?`, [Number(id)]);
    return rows[0] || null;
  },

  async create(lead) {
    const [result] = await pool.execute(
      `INSERT INTO leads(name,phone,email,country,university,loan_amount,student_name,co_applicant,occupation,source,remarks,login_city,sanction_city,credit_score,entrance_exam,status,assigned_to) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        lead.name || '',
        lead.phone || '',
        lead.email || '',
        lead.country || '',
        lead.university || '',
        lead.loanAmount || 0,
        lead.studentName || '',
        lead.coApplicant || '',
        lead.occupation || '',
        lead.source || 'Direct',
        lead.remarks || '',
        lead.loginCity || '',
        lead.sanctionCity || '',
        lead.creditScore ?? null,
        lead.entranceExam || '',
        lead.status || 'new',
        lead.assignedTo ?? null
      ]
    );
    const leadId = result.insertId;
    await this.syncModules(leadId, lead.status);
    return this.findById(leadId);
  },

  async update(id, lead) {
    await pool.execute(
      `UPDATE leads SET name=?,phone=?,email=?,country=?,university=?,loan_amount=?,student_name=?,co_applicant=?,occupation=?,source=?,remarks=?,login_city=?,sanction_city=?,credit_score=?,entrance_exam=?,status=?,assigned_to=? WHERE id=?`,
      [
        lead.name || '',
        lead.phone || '',
        lead.email || '',
        lead.country || '',
        lead.university || '',
        lead.loanAmount || 0,
        lead.studentName || '',
        lead.coApplicant || '',
        lead.occupation || '',
        lead.source || 'Direct',
        lead.remarks || '',
        lead.loginCity || '',
        lead.sanctionCity || '',
        lead.creditScore ?? null,
        lead.entranceExam || '',
        lead.status || 'new',
        lead.assignedTo ?? null,
        id
      ]
    );
    await this.syncModules(id, lead.status);
    return this.findById(id);
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM leads WHERE id=?', [Number(id)]);
    return result.affectedRows > 0;
  }
};

module.exports = LeadModel;
