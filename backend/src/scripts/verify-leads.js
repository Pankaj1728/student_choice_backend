const app = require('../app');
const pool = require('../config/db');

const server = app.listen(5010, async () => {
  try {
    const login = await fetch('http://127.0.0.1:5010/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@studentschoice.in', password: 'admin123' }) });
    const auth = await login.json(); if (!auth.token) throw new Error('Login failed');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` };
    const create = await fetch('http://127.0.0.1:5010/api/v1/leads', { method: 'POST', headers, body: JSON.stringify({ name:'API Test Lead',phone:'9000000001',email:'api.test@example.com',country:'Germany',university:'TU Munich',loanAmount:2500000,entranceExam:'GMAT 720',source:'Test',status:'new' }) });
    const item = await create.json(); if (!create.ok) throw new Error(item.error);
    if (item.lead.entrance_exam !== 'GMAT 720') throw new Error('Entrance exam field verification failed');
    const update = await fetch(`http://127.0.0.1:5010/api/v1/leads/${item.lead.id}`, { method:'PATCH',headers,body:JSON.stringify({ ...item.lead, loanAmount:2500000,entranceExam:'GRE 325',status:'interested',assignedTo:'',remarks:'API verification' }) });
    const changed = await update.json(); if (!update.ok) throw new Error(changed.error);
    if (changed.lead.entrance_exam !== 'GRE 325') throw new Error('Entrance exam update verification failed');
    const list = await fetch('http://127.0.0.1:5010/api/v1/leads?search=GRE', { headers }); const results = await list.json();
    await fetch(`http://127.0.0.1:5010/api/v1/leads/${item.lead.id}`, { method:'DELETE', headers });
    const bulk = await fetch('http://127.0.0.1:5010/api/v1/leads/bulk', { method:'POST', headers, body:JSON.stringify({ leads:[{name:'Bulk Test Lead',phone:'9000000002',country:'France',entranceExam:'IELTS 8',source:'CSV',status:'new'},{name:'Invalid row'}] }) });
    const bulkResult = await bulk.json(); if (!bulk.ok || bulkResult.imported !== 1 || bulkResult.skipped !== 1) throw new Error('Bulk import verification failed');
    const bulkList = await fetch('http://127.0.0.1:5010/api/v1/leads?search=Bulk%20Test', { headers }); const bulkRows = await bulkList.json();
    for (const row of bulkRows.leads) await fetch(`http://127.0.0.1:5010/api/v1/leads/${row.id}`, { method:'DELETE', headers });
    console.log(`Lead CRUD verified with entrance_exam field: ${changed.lead.entrance_exam}; search results: ${results.pagination.total}; bulk import: ${bulkResult.imported} imported / ${bulkResult.skipped} skipped`);
  } catch (error) { console.error(error); process.exitCode = 1; } finally { server.close(async () => { await pool.end(); }); }
});
