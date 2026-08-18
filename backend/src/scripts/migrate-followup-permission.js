const pool = require('../config/db');

(async () => {
  try {
    // 1. Insert 'followup.view' permission into permissions table
    await pool.query(`
      INSERT IGNORE INTO permissions (\`key\`, name)
      VALUES ('followup.view', 'View follow-ups')
    `);

    // 2. Fetch the permission ID for 'followup.view'
    const [permRows] = await pool.query(`SELECT id FROM permissions WHERE \`key\`='followup.view'`);
    if (permRows.length > 0) {
      const permId = permRows[0].id;

      // 3. Assign to all roles (super_admin, admin, manager, loan_advisor, etc.)
      const [roles] = await pool.query(`SELECT id FROM roles`);
      for (const role of roles) {
        await pool.query(`
          INSERT IGNORE INTO role_permissions (role_id, permission_id)
          VALUES (?, ?)
        `, [role.id, permId]);
      }
      console.log(`Successfully added 'followup.view' permission (ID: ${permId}) to ${roles.length} roles.`);
    }

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    await pool.end();
    process.exit(1);
  }
})();
