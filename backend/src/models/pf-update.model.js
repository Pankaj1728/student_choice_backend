const pool = require('../config/db');

async function initTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pf_updates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lead_id INT UNSIGNED NOT NULL UNIQUE,
      lender VARCHAR(100) DEFAULT 'AVANSE',
      lender_remarks TEXT NULL,
      sanction_amount DECIMAL(15, 2) DEFAULT 0.00,
      pf_amount DECIMAL(15, 2) DEFAULT 0.00,
      interest_rate VARCHAR(50) NULL,
      pf_paid DECIMAL(15, 2) DEFAULT 0.00,
      remarks TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_pf_updates_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `).catch(err => console.error('Error initializing pf_updates table:', err));
}

initTable();

function clean(v) {
  return String(v || '').trim();
}

const PfUpdateModel = {
  async findAll({ page = 1, limit = 20, search = '' }) {
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];

    if (search) {
      const term = `%${clean(search)}%`;
      where.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.university LIKE ? OR l.login_city LIKE ? OR pu.lender LIKE ?)');
      values.push(term, term, term, term, term, term);
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT 
         l.id AS lead_id,
         pu.id AS id,
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
         COALESCE(pu.lender, 'AVANSE') AS lender,
         pu.lender_remarks,
         COALESCE(pu.sanction_amount, 0) AS sanction_amount,
         COALESCE(pu.pf_amount, 0) AS pf_amount,
         pu.interest_rate,
         COALESCE(pu.pf_paid, 0) AS pf_paid,
         COALESCE(pu.remarks, 'PAID') AS remarks,
         l.created_at
       FROM leads l
       INNER JOIN pf_updates pu ON pu.lead_id = l.id
       ${clause}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    const [counts] = await pool.query(
      `SELECT COUNT(*) AS total FROM leads l INNER JOIN pf_updates pu ON pu.lead_id = l.id ${clause}`,
      values
    );

    return {
      pfs: rows,
      total: Number(counts[0].total)
    };
  },

  async findById(targetId) {
    const [rows] = await pool.execute(
      `SELECT 
         l.id AS lead_id,
         pu.id AS id,
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
         COALESCE(pu.lender, 'AVANSE') AS lender,
         pu.lender_remarks,
         COALESCE(pu.sanction_amount, 0) AS sanction_amount,
         COALESCE(pu.pf_amount, 0) AS pf_amount,
         pu.interest_rate,
         COALESCE(pu.pf_paid, 0) AS pf_paid,
         COALESCE(pu.remarks, 'PAID') AS remarks,
         l.created_at
       FROM leads l
       INNER JOIN pf_updates pu ON pu.lead_id = l.id
       WHERE l.id = ? OR pu.id = ?`,
      [targetId, targetId]
    );

    return rows[0] || null;
  },

  async upsert(leadId, data) {
    await pool.execute(
      `INSERT INTO pf_updates (lead_id, lender, lender_remarks, sanction_amount, pf_amount, interest_rate, pf_paid, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         lender=COALESCE(VALUES(lender), lender),
         lender_remarks=COALESCE(VALUES(lender_remarks), lender_remarks),
         sanction_amount=COALESCE(VALUES(sanction_amount), sanction_amount),
         pf_amount=COALESCE(VALUES(pf_amount), pf_amount),
         interest_rate=COALESCE(VALUES(interest_rate), interest_rate),
         pf_paid=COALESCE(VALUES(pf_paid), pf_paid),
         remarks=COALESCE(VALUES(remarks), remarks)`,
      [
        leadId,
        data.lender !== undefined ? clean(data.lender) : 'AVANSE',
        data.lender_remarks !== undefined ? clean(data.lender_remarks || data.lenderRemarks) : null,
        data.sanction_amount !== undefined ? Number(data.sanction_amount || data.sanctionAmount) : 0,
        data.pf_amount !== undefined ? Number(data.pf_amount || data.pfAmount) : 0,
        data.interest_rate !== undefined ? clean(data.interest_rate || data.interestRate) : null,
        data.pf_paid !== undefined ? Number(data.pf_paid || data.pfPaid) : 0,
        data.remarks !== undefined ? clean(data.remarks) : 'PAID'
      ]
    );

    const [rows] = await pool.execute('SELECT * FROM pf_updates WHERE lead_id=?', [leadId]);
    const pfRecord = rows[0];

    // Automatic Pipeline Transition: PF Update -> Disbursement
    try {
      const isPaid = Number(pfRecord.pf_paid) > 0 || ['PAID', 'PARTIALLY PAID'].includes(String(pfRecord.remarks || '').toUpperCase());
      if (isPaid) {
        const DisbursementModel = require('./disbursement.model');
        await DisbursementModel.upsert(leadId, {
          lender: pfRecord.lender,
          sanction_amount: pfRecord.sanction_amount,
          disbursed_amount: pfRecord.sanction_amount,
          tranche_number: '1ST TRANCHE',
          disbursed_date: new Date().toISOString().slice(0, 10),
          status: 'DISBURSED',
          remarks: `Auto-transferred from PF Update (${pfRecord.remarks || 'PAID'})`
        });
      }
    } catch (err) {
      console.error('Error during auto pipeline transition to Disbursement:', err);
    }

    return pfRecord;
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM pf_updates WHERE id=? OR lead_id=?', [Number(id), Number(id)]);
    return result.affectedRows > 0;
  }
};

module.exports = PfUpdateModel;
