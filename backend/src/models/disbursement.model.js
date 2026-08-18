const pool = require('../config/db');

async function initTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS disbursements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lead_id INT UNSIGNED NOT NULL UNIQUE,
      lender VARCHAR(100) DEFAULT 'AVANSE',
      sanction_amount DECIMAL(15, 2) DEFAULT 0.00,
      disbursed_amount DECIMAL(15, 2) DEFAULT 0.00,
      tranche_number VARCHAR(50) DEFAULT '1ST TRANCHE',
      disbursed_date DATE NULL,
      status VARCHAR(50) DEFAULT 'DISBURSED',
      remarks TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_disbursements_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `).catch(err => console.error('Error initializing disbursements table:', err));
}

initTable();

function clean(v) {
  return String(v || '').trim();
}

const DisbursementModel = {
  async findAll({ page = 1, limit = 20, search = '' }) {
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];

    if (search) {
      const term = `%${clean(search)}%`;
      where.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.university LIKE ? OR l.login_city LIKE ? OR d.lender LIKE ?)');
      values.push(term, term, term, term, term, term);
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT 
         l.id AS lead_id,
         d.id AS id,
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
         COALESCE(d.lender, 'AVANSE') AS lender,
         COALESCE(d.sanction_amount, 0) AS sanction_amount,
         COALESCE(d.disbursed_amount, 0) AS disbursed_amount,
         COALESCE(d.tranche_number, '1ST TRANCHE') AS tranche_number,
         d.disbursed_date,
         COALESCE(d.status, 'DISBURSED') AS status,
         d.remarks,
         l.created_at
       FROM leads l
       INNER JOIN disbursements d ON d.lead_id = l.id
       ${clause}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    const [counts] = await pool.query(
      `SELECT COUNT(*) AS total FROM leads l INNER JOIN disbursements d ON d.lead_id = l.id ${clause}`,
      values
    );

    return {
      disbursements: rows,
      total: Number(counts[0].total)
    };
  },

  async findById(targetId) {
    const [rows] = await pool.execute(
      `SELECT 
         l.id AS lead_id,
         d.id AS id,
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
         COALESCE(d.lender, 'AVANSE') AS lender,
         COALESCE(d.sanction_amount, 0) AS sanction_amount,
         COALESCE(d.disbursed_amount, 0) AS disbursed_amount,
         COALESCE(d.tranche_number, '1ST TRANCHE') AS tranche_number,
         d.disbursed_date,
         COALESCE(d.status, 'DISBURSED') AS status,
         d.remarks,
         l.created_at
       FROM leads l
       INNER JOIN disbursements d ON d.lead_id = l.id
       WHERE l.id = ? OR d.id = ?`,
      [targetId, targetId]
    );

    return rows[0] || null;
  },

  async upsert(leadId, data) {
    let dDate = data.disbursed_date || data.disbursedDate || null;
    if (dDate) {
      const parsed = new Date(dDate);
      if (!isNaN(parsed.getTime())) {
        dDate = parsed.toISOString().slice(0, 10);
      } else {
        dDate = null;
      }
    }

    await pool.execute(
      `INSERT INTO disbursements (lead_id, lender, sanction_amount, disbursed_amount, tranche_number, disbursed_date, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         lender=COALESCE(VALUES(lender), lender),
         sanction_amount=COALESCE(VALUES(sanction_amount), sanction_amount),
         disbursed_amount=COALESCE(VALUES(disbursed_amount), disbursed_amount),
         tranche_number=COALESCE(VALUES(tranche_number), tranche_number),
         disbursed_date=COALESCE(VALUES(disbursed_date), disbursed_date),
         status=COALESCE(VALUES(status), status),
         remarks=COALESCE(VALUES(remarks), remarks)`,
      [
        leadId,
        data.lender !== undefined ? clean(data.lender) : 'AVANSE',
        data.sanction_amount !== undefined ? Number(data.sanction_amount || data.sanctionAmount) : 0,
        data.disbursed_amount !== undefined ? Number(data.disbursed_amount || data.disbursedAmount) : 0,
        data.tranche_number !== undefined ? clean(data.tranche_number || data.trancheNumber) : '1ST TRANCHE',
        dDate,
        data.status !== undefined ? clean(data.status) : 'DISBURSED',
        data.remarks !== undefined ? clean(data.remarks) : null
      ]
    );

    const [rows] = await pool.execute('SELECT * FROM disbursements WHERE lead_id=?', [leadId]);
    const disbRecord = rows[0];

    // 1. Update lead status in leads table to 'disbursed' or 'disbursement'
    try {
      await pool.execute(
        `UPDATE leads SET status = 'disbursement' WHERE id = ? AND status != 'disbursement'`,
        [leadId]
      );
    } catch (err) {
      console.error('Error updating lead status in DisbursementModel:', err);
    }

    // 2. Automatic Pipeline Transition: Disbursement -> Cross Sales
    try {
      const CrossSalesModel = require('./cross-sales.model');
      await CrossSalesModel.upsert(leadId, {
        remarks: `Auto-created from Disbursement (${disbRecord.status || 'DISBURSED'})`
      });
    } catch (err) {
      console.error('Error during auto pipeline transition to Cross Sales:', err);
    }

    return disbRecord;
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM disbursements WHERE id=? OR lead_id=?', [Number(id), Number(id)]);
    return result.affectedRows > 0;
  }
};

module.exports = DisbursementModel;
