const pool = require('../config/db');

async function syncStatusEntries() {
  console.log('--- Syncing Status Entries for file_updates, sanction_files, and pf_updates ---');
  const conn = await pool.getConnection();
  try {
    // 1. Clean file_updates: Keep only leads where status = 'file_update'
    await conn.query(`DELETE FROM file_updates WHERE lead_id NOT IN (SELECT id FROM leads WHERE status = 'file_update')`);
    
    // Insert entries for leads currently having status = 'file_update'
    const [fileLeads] = await conn.query(`SELECT id FROM leads WHERE status = 'file_update'`);
    for (const l of fileLeads) {
      await conn.query(`INSERT IGNORE INTO file_updates (lead_id) VALUES (?)`, [l.id]);
    }
    console.log(`✓ Synchronized ${fileLeads.length} leads with status="file_update" into file_updates table.`);

    // 2. Clean sanction_files: Keep only leads where status = 'sanction'
    await conn.query(`DELETE FROM sanction_files WHERE lead_id NOT IN (SELECT id FROM leads WHERE status = 'sanction')`);
    const [sanctionLeads] = await conn.query(`SELECT id FROM leads WHERE status = 'sanction'`);
    for (const l of sanctionLeads) {
      await conn.query(`INSERT IGNORE INTO sanction_files (lead_id) VALUES (?)`, [l.id]);
    }
    console.log(`✓ Synchronized ${sanctionLeads.length} leads with status="sanction" into sanction_files table.`);

    // 3. Clean pf_updates: Keep only leads where status = 'pf_paid'
    await conn.query(`DELETE FROM pf_updates WHERE lead_id NOT IN (SELECT id FROM leads WHERE status = 'pf_paid')`);
    const [pfLeads] = await conn.query(`SELECT id FROM leads WHERE status = 'pf_paid'`);
    for (const l of pfLeads) {
      await conn.query(`INSERT IGNORE INTO pf_updates (lead_id) VALUES (?)`, [l.id]);
    }
    console.log(`✓ Synchronized ${pfLeads.length} leads with status="pf_paid" into pf_updates table.`);

    console.log('--- Status Entries Synchronization Complete ---');
  } catch (err) {
    console.error('Sync failed:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

syncStatusEntries();
