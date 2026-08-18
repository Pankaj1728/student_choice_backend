const pool = require('../config/db');

async function initTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sanction_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_id INT UNSIGNED NOT NULL,
        lender VARCHAR(100) DEFAULT 'AVANSE',
        lender_remarks TEXT NULL,
        sanction_amount DECIMAL(15, 2) DEFAULT 0.00,
        pf_amount DECIMAL(15, 2) DEFAULT 0.00,
        interest_rate VARCHAR(50) NULL,
        disbursement_amount DECIMAL(15, 2) DEFAULT 0.00,
        remarks TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_sanction_files_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure disbursement_amount column exists for existing tables
    const [cols] = await pool.query(`SHOW COLUMNS FROM sanction_files LIKE 'disbursement_amount'`);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE sanction_files ADD COLUMN disbursement_amount DECIMAL(15, 2) DEFAULT 0.00`).catch(() => {});
    }

    // Ensure normal index on lead_id exists first before dropping unique index
    await pool.query('CREATE INDEX idx_sanction_files_lead_id ON sanction_files(lead_id)').catch(() => {});

    // Dynamically drop UNIQUE constraint on lead_id if left over from legacy migrations
    const [indexes] = await pool.query(`SHOW INDEX FROM sanction_files WHERE Column_name = 'lead_id' AND Non_unique = 0`);
    for (const idx of indexes) {
      if (idx.Key_name !== 'PRIMARY') {
        await pool.query(`ALTER TABLE sanction_files DROP INDEX \`${idx.Key_name}\``).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Error initializing sanction_files table:', err);
  }
}

initTable();

function clean(v) {
  return String(v || '').trim();
}

const SanctionModel = {
  async findAll({ page = 1, limit = 20, search = '' }) {
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];

    if (search) {
      const term = `%${clean(search)}%`;
      where.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.university LIKE ? OR l.login_city LIKE ? OR sf.lender LIKE ?)');
      values.push(term, term, term, term, term, term);
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT 
         l.id AS lead_id,
         MAX(sf.id) AS id,
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
         GROUP_CONCAT(DISTINCT COALESCE(sf.lender, 'AVANSE') SEPARATOR ', ') AS lender,
         GROUP_CONCAT(DISTINCT NULLIF(sf.lender_remarks, '') SEPARATOR '; ') AS lender_remarks,
         SUM(COALESCE(sf.sanction_amount, 0)) AS sanction_amount,
         SUM(COALESCE(sf.pf_amount, 0)) AS pf_amount,
         SUM(COALESCE(sf.disbursement_amount, 0)) AS disbursement_amount,
         GROUP_CONCAT(DISTINCT NULLIF(sf.interest_rate, '') SEPARATOR ', ') AS interest_rate,
         COALESCE(MAX(sf.remarks), 'SANCTIONED') AS remarks,
         MAX(sf.created_at) AS created_at
       FROM leads l
       INNER JOIN sanction_files sf ON sf.lead_id = l.id
       ${clause}
       GROUP BY l.id
       ORDER BY MAX(sf.created_at) DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    const [counts] = await pool.query(
      `SELECT COUNT(DISTINCT l.id) AS total FROM leads l INNER JOIN sanction_files sf ON sf.lead_id = l.id ${clause}`,
      values
    );

    return {
      sanctions: rows,
      total: Number(counts[0]?.total || 0)
    };
  },

  async findById(targetId) {
    const [rows] = await pool.execute(
      `SELECT 
         l.id AS lead_id,
         sf.id AS id,
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
         COALESCE(sf.lender, 'AVANSE') AS lender,
         sf.lender_remarks,
         COALESCE(sf.sanction_amount, 0) AS sanction_amount,
         COALESCE(sf.pf_amount, 0) AS pf_amount,
         COALESCE(sf.disbursement_amount, 0) AS disbursement_amount,
         sf.interest_rate,
         COALESCE(sf.remarks, 'SANCTIONED') AS remarks,
         sf.created_at
       FROM leads l
       INNER JOIN sanction_files sf ON sf.lead_id = l.id
       WHERE sf.id = ? OR l.id = ?`,
      [targetId, targetId]
    );

    return rows[0] || null;
  },

  async findByLeadId(leadId) {
    const [leadRows] = await pool.execute(
      `SELECT 
         l.id AS lead_id,
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
         l.created_at
       FROM leads l
       WHERE l.id = ?`,
      [leadId]
    );
    if (!leadRows[0]) return null;

    const [sanctionRows] = await pool.execute(
      `SELECT 
         sf.id,
         sf.lead_id,
         COALESCE(sf.lender, 'AVANSE') AS lender,
         sf.lender_remarks,
         COALESCE(sf.sanction_amount, 0) AS sanction_amount,
         COALESCE(sf.pf_amount, 0) AS pf_amount,
         COALESCE(sf.disbursement_amount, 0) AS disbursement_amount,
         sf.interest_rate,
         COALESCE(sf.remarks, 'SANCTIONED') AS remarks,
         sf.created_at
       FROM sanction_files sf
       WHERE sf.lead_id = ?
       ORDER BY sf.id ASC`,
      [leadId]
    );

    return {
      lead: leadRows[0],
      sanctions: sanctionRows
    };
  },

  async upsert(leadId, data, targetId = null) {
    const recordId = targetId || data.id || data.sanction_id;
    let sanctionId = null;

    const disbAmount = data.disbursement_amount !== undefined
      ? Number(data.disbursement_amount || data.disbursementAmount || 0)
      : (data.disbursed_amount !== undefined ? Number(data.disbursed_amount || data.disbursedAmount || 0) : null);

    if (recordId) {
      const [existing] = await pool.execute('SELECT id FROM sanction_files WHERE id = ?', [recordId]);
      if (existing.length > 0) {
        sanctionId = existing[0].id;
        await pool.execute(
          `UPDATE sanction_files
           SET lender = COALESCE(?, lender),
               lender_remarks = COALESCE(?, lender_remarks),
               sanction_amount = COALESCE(?, sanction_amount),
               pf_amount = COALESCE(?, pf_amount),
               disbursement_amount = COALESCE(?, disbursement_amount),
               interest_rate = COALESCE(?, interest_rate),
               remarks = COALESCE(?, remarks)
           WHERE id = ?`,
          [
            data.lender !== undefined ? clean(data.lender) : null,
            data.lender_remarks !== undefined ? clean(data.lender_remarks || data.lenderRemarks) : null,
            data.sanction_amount !== undefined ? Number(data.sanction_amount || data.sanctionAmount) : null,
            data.pf_amount !== undefined ? Number(data.pf_amount || data.pfAmount) : null,
            disbAmount,
            data.interest_rate !== undefined ? clean(data.interest_rate || data.interestRate) : null,
            data.remarks !== undefined ? clean(data.remarks) : null,
            sanctionId
          ]
        );
      }
    }

    if (!sanctionId) {
      const lenderName = data.lender !== undefined ? clean(data.lender) : 'AVANSE';
      if (!data.is_new) {
        const [existingLender] = await pool.execute(
          'SELECT id FROM sanction_files WHERE lead_id = ? AND UPPER(lender) = UPPER(?)',
          [leadId, lenderName]
        );
        if (existingLender.length > 0) {
          sanctionId = existingLender[0].id;
          await pool.execute(
            `UPDATE sanction_files
             SET lender = ?,
                 lender_remarks = COALESCE(?, lender_remarks),
                 sanction_amount = COALESCE(?, sanction_amount),
                 pf_amount = COALESCE(?, pf_amount),
                 disbursement_amount = COALESCE(?, disbursement_amount),
                 interest_rate = COALESCE(?, interest_rate),
                 remarks = COALESCE(?, remarks)
             WHERE id = ?`,
            [
              lenderName,
              data.lender_remarks !== undefined ? clean(data.lender_remarks || data.lenderRemarks) : null,
              data.sanction_amount !== undefined ? Number(data.sanction_amount || data.sanctionAmount) : null,
              data.pf_amount !== undefined ? Number(data.pf_amount || data.pfAmount) : null,
              disbAmount,
              data.interest_rate !== undefined ? clean(data.interest_rate || data.interestRate) : null,
              data.remarks !== undefined ? clean(data.remarks) : null,
              sanctionId
            ]
          );
        }
      }

      if (!sanctionId) {
        const [res] = await pool.execute(
          `INSERT INTO sanction_files (lead_id, lender, lender_remarks, sanction_amount, pf_amount, disbursement_amount, interest_rate, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            leadId,
            lenderName,
            data.lender_remarks !== undefined ? clean(data.lender_remarks || data.lenderRemarks) : null,
            data.sanction_amount !== undefined ? Number(data.sanction_amount || data.sanctionAmount) : 0,
            data.pf_amount !== undefined ? Number(data.pf_amount || data.pfAmount) : 0,
            disbAmount !== null ? disbAmount : 0,
            data.interest_rate !== undefined ? clean(data.interest_rate || data.interestRate) : null,
            data.remarks !== undefined ? clean(data.remarks) : 'SANCTIONED'
          ]
        );
        sanctionId = res.insertId;
      }
    }

    const [rows] = await pool.execute('SELECT * FROM sanction_files WHERE id = ?', [sanctionId]);
    const sanctionRecord = rows[0];

    // Automatic Pipeline Transition: Sanction -> PF Update
    try {
      const PfUpdateModel = require('./pf-update.model');
      await PfUpdateModel.upsert(leadId, {
        lender: sanctionRecord.lender,
        lender_remarks: sanctionRecord.lender_remarks,
        sanction_amount: sanctionRecord.sanction_amount,
        pf_amount: sanctionRecord.pf_amount,
        interest_rate: sanctionRecord.interest_rate,
        remarks: sanctionRecord.pf_amount > 0 ? 'SANCTIONED' : 'PENDING'
      });
    } catch (err) {
      console.error('Error during auto pipeline transition to PF Update:', err);
    }

    return sanctionRecord;
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM sanction_files WHERE id=?', [Number(id)]);
    return result.affectedRows > 0;
  }
};

module.exports = SanctionModel;
