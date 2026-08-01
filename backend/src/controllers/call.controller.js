const pool = require('../config/db');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');

const statuses = ['pending', 'connected', 'not_answered', 'interested', 'follow_up', 'not_interested', 'wrong_number', 'completed'];
const cols = `c.id,c.lead_id,c.customer_name,c.phone,c.status,c.notes,c.follow_up_at,c.last_called_at,c.call_count,c.assigned_to,c.created_at,c.updated_at,u.name assigned_to_name,l.name lead_name`;
const trim = value => String(value || '').trim();
const normalizePhone = value => String(value || '').replace(/\D/g, '');
function data(body) {
  const item = { leadId:body.leadId ? Number(body.leadId) : null, customerName:trim(body.customerName), phone:normalizePhone(body.phone), status:trim(body.status) || 'pending', notes:trim(body.notes), followUpAt:body.followUpAt || null, assignedTo:body.assignedTo ? Number(body.assignedTo) : null };
  if (!item.phone) throw new AppError('Phone number is required', 422);
  if (!item.customerName) item.customerName = `Lead ${item.phone}`;
  if (item.phone.length < 7 || item.phone.length > 15) throw new AppError('Enter a valid phone number', 422);
  if (!statuses.includes(item.status)) throw new AppError('Select a valid call status', 422);
  return item;
}
async function validUser(id) { if (!id) return; const [rows] = await pool.execute('SELECT id FROM users WHERE id=? AND is_active=1',[id]); if(!rows[0]) throw new AppError('Assigned user is invalid or inactive',422); }
async function validLead(id) { if (!id) return; const [rows] = await pool.execute('SELECT id FROM leads WHERE id=?',[id]); if(!rows[0]) throw new AppError('Selected lead does not exist',422); }
exports.list = asyncHandler(async (req,res) => { const page=Math.max(Number(req.query.page)||1,1),limit=Math.min(Math.max(Number(req.query.limit)||10,1),100),offset=(page-1)*limit; const where=[],values=[]; if(req.query.search){const t=`%${trim(req.query.search)}%`;where.push('(c.customer_name LIKE ? OR c.phone LIKE ? OR l.name LIKE ?)');values.push(t,t,t);}if(req.query.status){where.push('c.status=?');values.push(req.query.status);}if(req.query.assignedTo){where.push('c.assigned_to=?');values.push(Number(req.query.assignedTo));}const clause=where.length?`WHERE ${where.join(' AND ')}`:'';const [calls]=await pool.query(`SELECT ${cols} FROM calls c LEFT JOIN users u ON u.id=c.assigned_to LEFT JOIN leads l ON l.id=c.lead_id ${clause} ORDER BY CASE WHEN c.status='pending' THEN 0 WHEN c.status='follow_up' THEN 1 ELSE 2 END,c.follow_up_at ASC,c.created_at DESC LIMIT ? OFFSET ?`,[...values,limit,offset]);const [count]=await pool.query(`SELECT COUNT(*) total FROM calls c LEFT JOIN leads l ON l.id=c.lead_id ${clause}`,values);res.json({calls,pagination:{page,limit,total:Number(count[0].total),pages:Math.max(Math.ceil(Number(count[0].total)/limit),1)}}); });
exports.stats = asyncHandler(async (_req,res)=>{const [rows]=await pool.query(`SELECT status,COUNT(*) count FROM calls GROUP BY status`);const total=rows.reduce((sum,row)=>sum+Number(row.count),0);const map=Object.fromEntries(rows.map(row=>[row.status,Number(row.count)]));res.json({total,pending:map.pending||0,followUps:map.follow_up||0,completed:(map.completed||0)+(map.connected||0)+(map.interested||0),notAnswered:map.not_answered||0});});
exports.meta = asyncHandler(async (_req,res)=>{const [users]=await pool.query('SELECT id,name FROM users WHERE is_active=1 ORDER BY name');const [leads]=await pool.query('SELECT id,name,phone FROM leads ORDER BY created_at DESC LIMIT 500');res.json({statuses,users,leads});});
exports.create = asyncHandler(async (req,res)=>{const item=data(req.body);await validUser(item.assignedTo);await validLead(item.leadId);let result;try{[result]=await pool.execute('INSERT INTO calls(lead_id,customer_name,phone,status,notes,follow_up_at,assigned_to) VALUES(?,?,?,?,?,?,?)',[item.leadId,item.customerName,item.phone,item.status,item.notes,item.followUpAt,item.assignedTo]);}catch(error){if(error.code==='ER_DUP_ENTRY')throw new AppError('This number is already assigned to a user',409);throw error;}const [rows]=await pool.execute(`SELECT ${cols} FROM calls c LEFT JOIN users u ON u.id=c.assigned_to LEFT JOIN leads l ON l.id=c.lead_id WHERE c.id=?`,[result.insertId]);res.status(201).json({call:rows[0]});});
exports.bulkCreate = asyncHandler(async (req, res) => {
  const assignedTo = Number(req.body.assignedTo); const rows = Array.isArray(req.body.calls) ? req.body.calls.slice(0, 1000) : [];
  if (!assignedTo) throw new AppError('Select a user to assign the numbers to', 422);
  if (!rows.length) throw new AppError('Upload a CSV with at least one phone number', 422);
  await validUser(assignedTo);
  const imported = []; const duplicates = []; const invalid = []; const seen = new Set();
  for (let index = 0; index < rows.length; index += 1) {
    const raw = rows[index] || {}; const phone = normalizePhone(raw.phone || raw.number || raw.mobile);
    if (phone.length < 7 || phone.length > 15) { invalid.push({ row:index + 2, message:'Invalid phone number' }); continue; }
    if (seen.has(phone)) { duplicates.push({ row:index + 2, phone, message:'Duplicate number in this file' }); continue; }
    seen.add(phone);
    const [existing] = await pool.execute('SELECT id,assigned_to FROM calls WHERE phone=? LIMIT 1', [phone]);
    if (existing[0]) { duplicates.push({ row:index + 2, phone, message:'Already assigned to a user' }); continue; }
    const name = trim(raw.customerName || raw.customer_name || raw.name) || `Lead ${phone}`;
    try { const [result] = await pool.execute('INSERT INTO calls(customer_name,phone,status,notes,assigned_to) VALUES(?,?,?,?,?)', [name,phone,'pending',trim(raw.notes || raw.remarks),assignedTo]); imported.push(result.insertId); }
    catch (error) { if (error.code === 'ER_DUP_ENTRY') duplicates.push({ row:index + 2,phone,message:'Already assigned to a user' }); else invalid.push({ row:index + 2,message:error.message }); }
  }
  res.status(201).json({ imported:imported.length, skippedDuplicates:duplicates.length, skippedInvalid:invalid.length, duplicates, invalid });
});
exports.convertToLead = asyncHandler(async (req, res) => {
  if (!req.user.permissions.includes('leads.manage')) throw new AppError('You do not have permission to create leads', 403);
  const id = Number(req.params.id);
  const lead = {
    name: trim(req.body.name), phone: normalizePhone(req.body.phone), email: trim(req.body.email), country: trim(req.body.country), university: trim(req.body.university), loanAmount: Number(req.body.loanAmount) || 0,
    studentName: trim(req.body.studentName), coApplicant: trim(req.body.coApplicant), occupation: trim(req.body.occupation), source: trim(req.body.source) || 'Calling', remarks: trim(req.body.remarks), loginCity: trim(req.body.loginCity), sanctionCity: trim(req.body.sanctionCity), creditScore: req.body.creditScore === '' || req.body.creditScore == null ? null : Number(req.body.creditScore), status: 'interested'
  };
  if (!lead.name || !lead.phone) throw new AppError('Lead name and phone number are required', 422);
  if (lead.creditScore !== null && (!Number.isInteger(lead.creditScore) || lead.creditScore < 300 || lead.creditScore > 900)) throw new AppError('Credit score must be between 300 and 900', 422);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [calls] = await connection.execute('SELECT id,lead_id,assigned_to,customer_name,phone,call_count FROM calls WHERE id=? FOR UPDATE', [id]);
    const call = calls[0];
    if (!call) throw new AppError('Call record not found', 404);
    if (call.lead_id) throw new AppError('This call has already been converted to a lead', 409);
    const [result] = await connection.execute('INSERT INTO leads(name,phone,email,country,university,loan_amount,student_name,co_applicant,occupation,source,remarks,login_city,sanction_city,credit_score,status,assigned_to) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [lead.name,lead.phone,lead.email,lead.country,lead.university,lead.loanAmount,lead.studentName,lead.coApplicant,lead.occupation,lead.source,lead.remarks,lead.loginCity,lead.sanctionCity,lead.creditScore,lead.status,call.assigned_to]);
    await connection.execute('UPDATE calls SET lead_id=?,customer_name=?,phone=?,status=?,notes=?,last_called_at=NOW(),call_count=call_count+1 WHERE id=?', [result.insertId,lead.name,lead.phone,'interested',lead.remarks,id]);
    await connection.commit();
    const [leads] = await pool.execute('SELECT l.*,u.name assigned_to_name FROM leads l LEFT JOIN users u ON u.id=l.assigned_to WHERE l.id=?', [result.insertId]);
    res.status(201).json({ lead: leads[0] });
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
});
exports.update = asyncHandler(async (req,res)=>{const id=Number(req.params.id),[found]=await pool.execute('SELECT id,call_count FROM calls WHERE id=?',[id]);if(!found[0])throw new AppError('Call record not found',404);const item=data(req.body);await validUser(item.assignedTo);await validLead(item.leadId);const wasCalled=Boolean(req.body.markCalled);await pool.execute('UPDATE calls SET lead_id=?,customer_name=?,phone=?,status=?,notes=?,follow_up_at=?,assigned_to=?,last_called_at=IF(?,NOW(),last_called_at),call_count=call_count+IF(?,1,0) WHERE id=?',[item.leadId,item.customerName,item.phone,item.status,item.notes,item.followUpAt,item.assignedTo,wasCalled,wasCalled,id]);const [rows]=await pool.execute(`SELECT ${cols} FROM calls c LEFT JOIN users u ON u.id=c.assigned_to LEFT JOIN leads l ON l.id=c.lead_id WHERE c.id=?`,[id]);res.json({call:rows[0]});});
exports.remove = asyncHandler(async(req,res)=>{const [result]=await pool.execute('DELETE FROM calls WHERE id=?',[Number(req.params.id)]);if(!result.affectedRows)throw new AppError('Call record not found',404);res.json({ok:true});});
