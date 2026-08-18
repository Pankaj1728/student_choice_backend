const pool = require('../config/db');

async function initTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS file_updates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lead_id INT UNSIGNED NOT NULL UNIQUE,
      creola VARCHAR(100) DEFAULT 'NOT MOVED',
      creola_remarks TEXT NULL,
      nuvama VARCHAR(100) DEFAULT 'NOT MOVED',
      nuvama_remarks TEXT NULL,
      incred VARCHAR(100) DEFAULT 'NOT MOVED',
      incred_remarks TEXT NULL,
      auxilo VARCHAR(100) DEFAULT 'NOT MOVED',
      auxilo_remarks TEXT NULL,
      tata VARCHAR(100) DEFAULT 'NOT MOVED',
      tata_remarks TEXT NULL,
      poonawalla VARCHAR(100) DEFAULT 'NOT MOVED',
      poonawalla_remarks TEXT NULL,
      avanse_global VARCHAR(100) DEFAULT 'NOT MOVED',
      avanse_global_remarks TEXT NULL,
      edgrow VARCHAR(100) DEFAULT 'NOT MOVED',
      edgrow_remarks TEXT NULL,
      prodigy VARCHAR(100) DEFAULT 'NOT MOVED',
      prodigy_remarks TEXT NULL,
      idfc VARCHAR(100) DEFAULT 'NOT MOVED',
      idfc_remarks TEXT NULL,
      icici VARCHAR(100) DEFAULT 'NOT MOVED',
      icici_remarks TEXT NULL,
      axis VARCHAR(100) DEFAULT 'NOT MOVED',
      axis_remarks TEXT NULL,
      yes_bank VARCHAR(100) DEFAULT 'NOT MOVED',
      yes_bank_remarks TEXT NULL,
      union_bank VARCHAR(100) DEFAULT 'NOT MOVED',
      union_bank_remarks TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_file_updates_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `).catch(err => console.error('Error initializing file_updates table:', err));
}

initTable();

function clean(v) {
  return String(v || '').trim();
}

function val(v) {
  return v !== undefined && v !== null ? clean(v) : null;
}

const FileUpdateModel = {
  async findAll({ page = 1, limit = 20, search = '' }) {
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];

    if (search) {
      const term = `%${clean(search)}%`;
      where.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.university LIKE ? OR l.login_city LIKE ? OR l.sanction_city LIKE ?)');
      values.push(term, term, term, term, term, term);
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT 
         l.id AS lead_id,
         fu.id AS id,
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
         COALESCE(fu.creola, 'NOT MOVED') AS creola,
         fu.creola_remarks,
         COALESCE(fu.nuvama, 'NOT MOVED') AS nuvama,
         fu.nuvama_remarks,
         COALESCE(fu.incred, 'NOT MOVED') AS incred,
         fu.incred_remarks,
         COALESCE(fu.auxilo, 'NOT MOVED') AS auxilo,
         fu.auxilo_remarks,
         COALESCE(fu.tata, 'NOT MOVED') AS tata,
         fu.tata_remarks,
         COALESCE(fu.poonawalla, 'NOT MOVED') AS poonawalla,
         fu.poonawalla_remarks,
         COALESCE(fu.avanse_global, 'NOT MOVED') AS avanse_global,
         fu.avanse_global_remarks,
         COALESCE(fu.edgrow, 'NOT MOVED') AS edgrow,
         fu.edgrow_remarks,
         COALESCE(fu.prodigy, 'NOT MOVED') AS prodigy,
         fu.prodigy_remarks,
         COALESCE(fu.idfc, 'NOT MOVED') AS idfc,
         fu.idfc_remarks,
         COALESCE(fu.icici, 'NOT MOVED') AS icici,
         fu.icici_remarks,
         COALESCE(fu.axis, 'NOT MOVED') AS axis,
         fu.axis_remarks,
         COALESCE(fu.yes_bank, 'NOT MOVED') AS yes_bank,
         fu.yes_bank_remarks,
         COALESCE(fu.union_bank, 'NOT MOVED') AS union_bank,
         fu.union_bank_remarks,
         l.created_at
       FROM leads l
       INNER JOIN file_updates fu ON fu.lead_id = l.id
       ${clause}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    const [counts] = await pool.query(
      `SELECT COUNT(*) AS total FROM leads l INNER JOIN file_updates fu ON fu.lead_id = l.id ${clause}`,
      values
    );

    return {
      files: rows,
      total: Number(counts[0].total)
    };
  },

  async findById(targetId) {
    const [rows] = await pool.execute(
      `SELECT 
         l.id AS lead_id,
         fu.id AS id,
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
         COALESCE(fu.creola, 'NOT MOVED') AS creola,
         fu.creola_remarks,
         COALESCE(fu.nuvama, 'NOT MOVED') AS nuvama,
         fu.nuvama_remarks,
         COALESCE(fu.incred, 'NOT MOVED') AS incred,
         fu.incred_remarks,
         COALESCE(fu.auxilo, 'NOT MOVED') AS auxilo,
         fu.auxilo_remarks,
         COALESCE(fu.tata, 'NOT MOVED') AS tata,
         fu.tata_remarks,
         COALESCE(fu.poonawalla, 'NOT MOVED') AS poonawalla,
         fu.poonawalla_remarks,
         COALESCE(fu.avanse_global, 'NOT MOVED') AS avanse_global,
         fu.avanse_global_remarks,
         COALESCE(fu.edgrow, 'NOT MOVED') AS edgrow,
         fu.edgrow_remarks,
         COALESCE(fu.prodigy, 'NOT MOVED') AS prodigy,
         fu.prodigy_remarks,
         COALESCE(fu.idfc, 'NOT MOVED') AS idfc,
         fu.idfc_remarks,
         COALESCE(fu.icici, 'NOT MOVED') AS icici,
         fu.icici_remarks,
         COALESCE(fu.axis, 'NOT MOVED') AS axis,
         fu.axis_remarks,
         COALESCE(fu.yes_bank, 'NOT MOVED') AS yes_bank,
         fu.yes_bank_remarks,
         COALESCE(fu.union_bank, 'NOT MOVED') AS union_bank,
         l.created_at
       FROM leads l
       INNER JOIN file_updates fu ON fu.lead_id = l.id
       WHERE l.id = ? OR fu.id = ?`,
      [targetId, targetId]
    );

    return rows[0] || null;
  },

  async upsert(leadId, data) {
    await pool.execute(
      `INSERT INTO file_updates (lead_id, creola, creola_remarks, nuvama, nuvama_remarks, incred, incred_remarks, auxilo, auxilo_remarks, tata, tata_remarks, poonawalla, poonawalla_remarks, avanse_global, avanse_global_remarks, edgrow, edgrow_remarks, prodigy, prodigy_remarks, idfc, idfc_remarks, icici, icici_remarks, axis, axis_remarks, yes_bank, yes_bank_remarks, union_bank, union_bank_remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         creola=COALESCE(VALUES(creola), creola), creola_remarks=COALESCE(VALUES(creola_remarks), creola_remarks),
         nuvama=COALESCE(VALUES(nuvama), nuvama), nuvama_remarks=COALESCE(VALUES(nuvama_remarks), nuvama_remarks),
         incred=COALESCE(VALUES(incred), incred), incred_remarks=COALESCE(VALUES(incred_remarks), incred_remarks),
         auxilo=COALESCE(VALUES(auxilo), auxilo), auxilo_remarks=COALESCE(VALUES(auxilo_remarks), auxilo_remarks),
         tata=COALESCE(VALUES(tata), tata), tata_remarks=COALESCE(VALUES(tata_remarks), tata_remarks),
         poonawalla=COALESCE(VALUES(poonawalla), poonawalla), poonawalla_remarks=COALESCE(VALUES(poonawalla_remarks), poonawalla_remarks),
         avanse_global=COALESCE(VALUES(avanse_global), avanse_global), avanse_global_remarks=COALESCE(VALUES(avanse_global_remarks), avanse_global_remarks),
         edgrow=COALESCE(VALUES(edgrow), edgrow), edgrow_remarks=COALESCE(VALUES(edgrow_remarks), edgrow_remarks),
         prodigy=COALESCE(VALUES(prodigy), prodigy), prodigy_remarks=COALESCE(VALUES(prodigy_remarks), prodigy_remarks),
         idfc=COALESCE(VALUES(idfc), idfc), idfc_remarks=COALESCE(VALUES(idfc_remarks), idfc_remarks),
         icici=COALESCE(VALUES(icici), icici), icici_remarks=COALESCE(VALUES(icici_remarks), icici_remarks),
         axis=COALESCE(VALUES(axis), axis), axis_remarks=COALESCE(VALUES(axis_remarks), axis_remarks),
         yes_bank=COALESCE(VALUES(yes_bank), yes_bank), yes_bank_remarks=COALESCE(VALUES(yes_bank_remarks), yes_bank_remarks),
         union_bank=COALESCE(VALUES(union_bank), union_bank), union_bank_remarks=COALESCE(VALUES(union_bank_remarks), union_bank_remarks)`,
      [
        leadId,
        val(data.creola), val(data.creola_remarks),
        val(data.nuvama), val(data.nuvama_remarks),
        val(data.incred), val(data.incred_remarks),
        val(data.auxilo), val(data.auxilo_remarks),
        val(data.tata), val(data.tata_remarks),
        val(data.poonawalla), val(data.poonawalla_remarks),
        val(data.avanse_global), val(data.avanse_global_remarks),
        val(data.edgrow), val(data.edgrow_remarks),
        val(data.prodigy), val(data.prodigy_remarks),
        val(data.idfc), val(data.idfc_remarks),
        val(data.icici), val(data.icici_remarks),
        val(data.axis), val(data.axis_remarks),
        val(data.yes_bank), val(data.yes_bank_remarks),
        val(data.union_bank), val(data.union_bank_remarks)
      ]
    );

    const updatedRecord = await this.findById(leadId);

    // Automatic Pipeline Transition: Files Update -> Sanction
    try {
      const LENDERS = [
        { key: 'creola', remarksKey: 'creola_remarks', name: 'CREOLA' },
        { key: 'nuvama', remarksKey: 'nuvama_remarks', name: 'NUVAMA' },
        { key: 'incred', remarksKey: 'incred_remarks', name: 'INCRED' },
        { key: 'auxilo', remarksKey: 'auxilo_remarks', name: 'AUXILO' },
        { key: 'tata', remarksKey: 'tata_remarks', name: 'TATA' },
        { key: 'poonawalla', remarksKey: 'poonawalla_remarks', name: 'POONAWALLA' },
        { key: 'avanse_global', remarksKey: 'avanse_global_remarks', name: 'AVANSE' },
        { key: 'edgrow', remarksKey: 'edgrow_remarks', name: 'EDGROW' },
        { key: 'prodigy', remarksKey: 'prodigy_remarks', name: 'PRODIGY' },
        { key: 'idfc', remarksKey: 'idfc_remarks', name: 'IDFC' },
        { key: 'icici', remarksKey: 'icici_remarks', name: 'ICICI' },
        { key: 'axis', remarksKey: 'axis_remarks', name: 'AXIS' },
        { key: 'yes_bank', remarksKey: 'yes_bank_remarks', name: 'YES BANK' },
        { key: 'union_bank', remarksKey: 'union_bank_remarks', name: 'UNION BANK' }
      ];

      const SanctionModel = require('./sanction.model');
      for (const lender of LENDERS) {
        const st = String(updatedRecord[lender.key] || '').toUpperCase();
        if (st === 'SANCTIONED' || st === 'SANCTION') {
          await SanctionModel.upsert(leadId, {
            lender: lender.name,
            lender_remarks: updatedRecord[lender.remarksKey] || null,
            sanction_amount: updatedRecord.loan_amount || 0,
            remarks: 'SANCTIONED'
          });
        } else {
          // If bank status in Files Update is no longer SANCTIONED, delete its sanction entry for this lead
          const [found] = await pool.execute(
            'SELECT id FROM sanction_files WHERE lead_id = ? AND UPPER(lender) = UPPER(?)',
            [leadId, lender.name]
          );
          if (found.length > 0) {
            for (const f of found) {
              await SanctionModel.remove(f.id);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error during auto pipeline transition to Sanction:', err);
    }

    return updatedRecord;
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM file_updates WHERE id=? OR lead_id=?', [Number(id), Number(id)]);
    return result.affectedRows > 0;
  }
};

module.exports = FileUpdateModel;
