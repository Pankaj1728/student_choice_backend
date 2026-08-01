const app = require('./app'); const env = require('./config/env'); const pool = require('./config/db');
const server = app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`));
async function shutdown() { server.close(); await pool.end(); process.exit(0); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
