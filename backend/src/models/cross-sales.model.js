const pool = require('../config/db');

async function initTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cross_sales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lead_id INT UNSIGNED NOT NULL UNIQUE,
      forex_status VARCHAR(50) DEFAULT 'NOT INTERESTED',
      forex_partner VARCHAR(100) DEFAULT 'NUVAMA FOREX',
      gic_status VARCHAR(50) DEFAULT 'NOT REQUIRED',
      insurance_status VARCHAR(50) DEFAULT 'NOT INTERESTED',
      insurance_partner VARCHAR(100) DEFAULT 'TATA AIG',
      sim_status VARCHAR(50) DEFAULT 'NOT REQUIRED',
      remarks TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_cross_sales_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `).catch(err => console.error('Error initializing cross_sales table:', err));
}

initTable();

function clean(v) {
  return String(v || '').trim();
}

const CrossSalesModel = {
  async findAll({ page = 1, limit = 20, search = '' }) {
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];

    if (search) {
      const term = `%${clean(search)}%`;
      where.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.university LIKE ? OR l.login_city LIKE ? OR cs.forex_partner LIKE ?)');
      values.push(term, term, term, term, term, term);
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT 
         l.id AS lead_id,
         cs.id AS id,
         l.name,
         l.phone,
         l.email,
         l.country,
         l.university,
         l.entrance_exam,
         l.loan_amount,
         IF(l.student_name IS NOT NULL AND l.student_name <> '', 'YES', 'NO') AS student_we,
         l.co_applicant,
         l.occupation,
         COALESCE(NULLIF(l.login_city, ''), l.sanction_city, '') AS city,
         UPPER(l.status) AS interested,
         COALESCE(cs.forex_status, 'NOT INTERESTED') AS forex_status,
         COALESCE(cs.forex_partner, 'NUVAMA FOREX') AS forex_partner,
         COALESCE(cs.gic_status, 'NOT REQUIRED') AS gic_status,
         COALESCE(cs.insurance_status, 'NOT INTERESTED') AS insurance_status,
         COALESCE(cs.insurance_partner, 'TATA AIG') AS insurance_partner,
         COALESCE(cs.sim_status, 'NOT REQUIRED') AS sim_status,
         cs.remarks,
         l.created_at
       FROM leads l
       LEFT JOIN cross_sales cs ON cs.lead_id = l.id
       ${clause}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    const [counts] = await pool.query(
      `SELECT COUNT(*) AS total FROM leads l LEFT JOIN cross_sales cs ON cs.lead_id = l.id ${clause}`,
      values
    );

    return {
      crossSales: rows,
      total: Number(counts[0].total)
    };
  },

  async findById(targetId) {
    const [rows] = await pool.execute(
      `SELECT 
         l.id AS lead_id,
         cs.id AS id,
         l.name,
         l.phone,
         l.email,
         l.country,
         l.university,
         l.entrance_exam,
         l.loan_amount,
         IF(l.student_name IS NOT NULL AND l.student_name <> '', 'YES', 'NO') AS student_we,
         l.co_applicant,
         l.occupation,
         COALESCE(NULLIF(l.login_city, ''), l.sanction_city, '') AS city,
         UPPER(l.status) AS interested,
         COALESCE(cs.forex_status, 'NOT INTERESTED') AS forex_status,
         COALESCE(cs.forex_partner, 'NUVAMA FOREX') AS forex_partner,
         COALESCE(cs.gic_status, 'NOT REQUIRED') AS gic_status,
         COALESCE(cs.insurance_status, 'NOT INTERESTED') AS insurance_status,
         COALESCE(cs.insurance_partner, 'TATA AIG') AS insurance_partner,
         COALESCE(cs.sim_status, 'NOT REQUIRED') AS sim_status,
         cs.remarks,
         l.created_at
       FROM leads l
       LEFT JOIN cross_sales cs ON cs.lead_id = l.id
       WHERE l.id = ? OR cs.id = ?`,
      [targetId, targetId]
    );

    return rows[0] || null;
  },

  async upsert(leadId, data) {
    await pool.execute(
      `INSERT INTO cross_sales (lead_id, forex_status, forex_partner, gic_status, insurance_status, insurance_partner, sim_status, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         forex_status=COALESCE(VALUES(forex_status), forex_status),
         forex_partner=COALESCE(VALUES(forex_partner), forex_partner),
         gic_status=COALESCE(VALUES(gic_status), gic_status),
         insurance_status=COALESCE(VALUES(insurance_status), insurance_status),
         insurance_partner=COALESCE(VALUES(insurance_partner), insurance_partner),
         sim_status=COALESCE(VALUES(sim_status), sim_status),
         remarks=COALESCE(VALUES(remarks), remarks)`,
      [
        leadId,
        data.forex_status !== undefined ? clean(data.forex_status) : 'NOT INTERESTED',
        data.forex_partner !== undefined ? clean(data.forex_partner) : 'NUVAMA FOREX',
        data.gic_status !== undefined ? clean(data.gic_status) : 'NOT REQUIRED',
        data.insurance_status !== undefined ? clean(data.insurance_status) : 'NOT INTERESTED',
        data.insurance_partner !== undefined ? clean(data.insurance_partner) : 'TATA AIG',
        data.sim_status !== undefined ? clean(data.sim_status) : 'NOT REQUIRED',
        data.remarks !== undefined ? clean(data.remarks) : null
      ]
    );

    return this.findById(leadId);
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM cross_sales WHERE id=? OR lead_id=?', [Number(id), Number(id)]);
    return result.affectedRows > 0;
  }
};

module.exports = CrossSalesModel;
