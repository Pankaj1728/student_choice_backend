const pool = require('../config/db');

async function migrateSeparateTables() {
  console.log('--- Migrating Separate Database Tables ---');
  const conn = await pool.getConnection();
  try {
    // 1. Dedicated Table for Files Update module
    console.log('Creating "file_updates" table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS file_updates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_id INT NULL,
        date VARCHAR(50) NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255) NULL,
        country VARCHAR(100) NULL,
        university VARCHAR(255) NULL,
        entrance_exam VARCHAR(100) NULL,
        loan_amount DECIMAL(15, 2) DEFAULT 0.00,
        student_we VARCHAR(50) NULL,
        co_applicant VARCHAR(100) NULL,
        occupation VARCHAR(100) NULL,
        city VARCHAR(100) NULL,
        interested VARCHAR(100) NULL,
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✓ Table "file_updates" created successfully.');

    // 2. Dedicated Table for Sanction module
    console.log('Creating "sanction_files" table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sanction_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_id INT NULL,
        date VARCHAR(50) NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255) NULL,
        country VARCHAR(100) NULL,
        university VARCHAR(255) NULL,
        entrance_exam VARCHAR(100) NULL,
        loan_amount DECIMAL(15, 2) DEFAULT 0.00,
        student_we VARCHAR(50) NULL,
        co_applicant VARCHAR(100) NULL,
        occupation VARCHAR(100) NULL,
        city VARCHAR(100) NULL,
        interested VARCHAR(100) NULL,
        lender VARCHAR(100) DEFAULT 'AVANSE',
        lender_remarks TEXT NULL,
        sanction_amount DECIMAL(15, 2) DEFAULT 0.00,
        pf_amount DECIMAL(15, 2) DEFAULT 0.00,
        interest_rate VARCHAR(50) NULL,
        remarks TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✓ Table "sanction_files" created successfully.');

    // 3. Dedicated Table for PF Update module
    console.log('Creating "pf_updates" table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pf_updates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_id INT NULL,
        date VARCHAR(50) NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255) NULL,
        country VARCHAR(100) NULL,
        university VARCHAR(255) NULL,
        entrance_exam VARCHAR(100) NULL,
        loan_amount DECIMAL(15, 2) DEFAULT 0.00,
        student_we VARCHAR(50) NULL,
        co_applicant VARCHAR(100) NULL,
        occupation VARCHAR(100) NULL,
        city VARCHAR(100) NULL,
        interested VARCHAR(100) NULL,
        lender VARCHAR(100) DEFAULT 'AVANSE',
        lender_remarks TEXT NULL,
        sanction_amount DECIMAL(15, 2) DEFAULT 0.00,
        pf_amount DECIMAL(15, 2) DEFAULT 0.00,
        interest_rate VARCHAR(50) NULL,
        pf_paid DECIMAL(15, 2) DEFAULT 0.00,
        remarks TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✓ Table "pf_updates" created successfully.');

    console.log('--- All Separate Tables Migration Complete ---');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrateSeparateTables();
