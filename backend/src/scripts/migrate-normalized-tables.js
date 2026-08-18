const pool = require('../config/db');

async function migrateNormalizedTables() {
  console.log('--- Migrating to Normalized Database Schema with Foreign Keys ---');
  const conn = await pool.getConnection();
  try {
    // Drop existing non-normalized tables if they exist
    await conn.query('DROP TABLE IF EXISTS file_updates');
    await conn.query('DROP TABLE IF EXISTS sanction_files');
    await conn.query('DROP TABLE IF EXISTS pf_updates');

    // 1. Normalized file_updates table referencing leads.id (INT UNSIGNED)
    console.log('Creating normalized "file_updates" table (FK -> leads.id)...');
    await conn.query(`
      CREATE TABLE file_updates (
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
    `);
    console.log('✓ Normalized "file_updates" table created successfully.');

    // 2. Normalized sanction_files table referencing leads.id (INT UNSIGNED)
    console.log('Creating normalized "sanction_files" table (FK -> leads.id)...');
    await conn.query(`
      CREATE TABLE sanction_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_id INT UNSIGNED NOT NULL UNIQUE,
        lender VARCHAR(100) DEFAULT 'AVANSE',
        lender_remarks TEXT NULL,
        sanction_amount DECIMAL(15, 2) DEFAULT 0.00,
        pf_amount DECIMAL(15, 2) DEFAULT 0.00,
        interest_rate VARCHAR(50) NULL,
        remarks TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_sanction_files_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✓ Normalized "sanction_files" table created successfully.');

    // 3. Normalized pf_updates table referencing leads.id (INT UNSIGNED)
    console.log('Creating normalized "pf_updates" table (FK -> leads.id)...');
    await conn.query(`
      CREATE TABLE pf_updates (
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
    `);
    console.log('✓ Normalized "pf_updates" table created successfully.');

    // Populate initial rows for existing leads
    console.log('Seeding initial rows for existing leads...');
    const [leads] = await conn.query('SELECT id FROM leads');
    for (const l of leads) {
      await conn.query('INSERT IGNORE INTO file_updates (lead_id) VALUES (?)', [l.id]);
      await conn.query('INSERT IGNORE INTO sanction_files (lead_id, lender, lender_remarks, sanction_amount, pf_amount, interest_rate, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)', [l.id, 'AVANSE', 'DS032012100', 38000, 15000, '11.25', 'SANCTIONED']);
      await conn.query('INSERT IGNORE INTO pf_updates (lead_id, lender, lender_remarks, sanction_amount, pf_amount, interest_rate, pf_paid, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [l.id, 'AVANSE', 'DS032012100', 38000, 15000, '11.25', 10000, 'PAID']);
    }
    console.log('✓ Seeded normalized records for existing leads.');

    console.log('--- Migration to Normalized Database Tables Completed Successfully ---');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrateNormalizedTables();
