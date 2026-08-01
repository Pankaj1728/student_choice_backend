const pool = require('../config/db');
(async () => {
  const [duplicates] = await pool.query('SELECT phone,COUNT(*) count FROM calls GROUP BY phone HAVING COUNT(*) > 1');
  if (duplicates.length) throw new Error(`Cannot enable duplicate protection. Resolve ${duplicates.length} duplicate phone number(s) first.`);
  try { await pool.query('ALTER TABLE calls ADD UNIQUE KEY uq_calls_phone (phone)'); console.log('Unique phone protection enabled'); }
  catch (error) { if (error.code === 'ER_DUP_KEYNAME') console.log('Unique phone protection already enabled'); else throw error; }
  await pool.end();
})().catch(async error => { console.error(error.message); await pool.end(); process.exit(1); });
