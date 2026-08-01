const pool = require('../config/db');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');

const leadColumns = `l.id,l.name,l.phone,l.email,l.country,l.university,l.loan_amount,l.student_name,l.co_applicant,l.occupation,l.source,l.remarks,l.login_city,l.sanction_city,l.credit_score,l.status,l.assigned_to,l.created_at,l.updated_at,u.name AS assigned_to_name`;
const statuses = ['new', 'interested', 'file_update', 'login', 'sanction', 'pf_paid', 'disbursed', 'rejected'];
function cleanString(value) { return String(value || '').trim(); }
function payload(body) {
  const record = {
    name: cleanString(body.name), phone: cleanString(body.phone), email: cleanString(body.email), country: cleanString(body.country), university: cleanString(body.university), loanAmount: Number(body.loanAmount) || 0,
    studentName: cleanString(body.studentName), coApplicant: cleanString(body.coApplicant), occupation: cleanString(body.occupation), source: cleanString(body.source) || 'Direct', remarks: cleanString(body.remarks), loginCity: cleanString(body.loginCity), sanctionCity: cleanString(body.sanctionCity), creditScore: body.creditScore === '' || body.creditScore == null ? null : Number(body.creditScore), status: cleanString(body.status) || 'new', assignedTo: body.assignedTo ? Number(body.assignedTo) : null
  };
  if (!record.name || !record.phone) throw new AppError('Lead name and phone number are required', 422);
  if (!statuses.includes(record.status)) throw new AppError('Select a valid lead status', 422);
  if (record.creditScore !== null && (!Number.isInteger(record.creditScore) || record.creditScore < 300 || record.creditScore > 900)) throw new AppError('Credit score must be between 300 and 900', 422);
  return record;
}
async function checkAssignee(id) { if (!id) return; const [users] = await pool.execute('SELECT id FROM users WHERE id=? AND is_active=1', [id]); if (!users[0]) throw new AppError('Assigned user is invalid or inactive', 422); }
exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1); const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100); const offset = (page - 1) * limit;
  const where = []; const values = [];
  if (req.query.search) { const term = `%${String(req.query.search).trim()}%`; where.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.university LIKE ?)'); values.push(term, term, term, term); }
  if (req.query.status) { where.push('l.status=?'); values.push(req.query.status); }
  if (req.query.source) { where.push('l.source=?'); values.push(req.query.source); }
  if (req.query.assignedTo) { where.push('l.assigned_to=?'); values.push(Number(req.query.assignedTo)); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [leads] = await pool.query(`SELECT ${leadColumns} FROM leads l LEFT JOIN users u ON u.id=l.assigned_to ${clause} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`, [...values, limit, offset]);
  const [counts] = await pool.query(`SELECT COUNT(*) AS total FROM leads l ${clause}`, values);
  res.json({ leads, pagination: { page, limit, total: Number(counts[0].total), pages: Math.max(Math.ceil(Number(counts[0].total) / limit), 1) } });
});
exports.get = asyncHandler(async (req, res) => { const [rows] = await pool.execute(`SELECT ${leadColumns} FROM leads l LEFT JOIN users u ON u.id=l.assigned_to WHERE l.id=?`, [Number(req.params.id)]); if (!rows[0]) throw new AppError('Lead not found', 404); res.json({ lead: rows[0] }); });
exports.meta = asyncHandler(async (_req, res) => { const [sources] = await pool.query('SELECT DISTINCT source FROM leads WHERE source <> \'\' ORDER BY source'); const [users] = await pool.query('SELECT id,name,email FROM users WHERE is_active=1 ORDER BY name'); res.json({ statuses, sources: sources.map(row => row.source), users }); });
exports.create = asyncHandler(async (req, res) => { const lead = payload(req.body); await checkAssignee(lead.assignedTo); const [result] = await pool.execute(`INSERT INTO leads(name,phone,email,country,university,loan_amount,student_name,co_applicant,occupation,source,remarks,login_city,sanction_city,credit_score,status,assigned_to) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [lead.name,lead.phone,lead.email,lead.country,lead.university,lead.loanAmount,lead.studentName,lead.coApplicant,lead.occupation,lead.source,lead.remarks,lead.loginCity,lead.sanctionCity,lead.creditScore,lead.status,lead.assignedTo]); const [rows] = await pool.execute(`SELECT ${leadColumns} FROM leads l LEFT JOIN users u ON u.id=l.assigned_to WHERE l.id=?`, [result.insertId]); res.status(201).json({ lead: rows[0] }); });
exports.bulkCreate = asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.leads) ? req.body.leads.slice(0, 500) : [];
  if (!items.length) throw new AppError('Upload a CSV with at least one lead', 422);
  const imported = []; const errors = [];
  for (let index = 0; index < items.length; index += 1) {
    try {
      const lead = payload(items[index]); await checkAssignee(lead.assignedTo);
      const [result] = await pool.execute(`INSERT INTO leads(name,phone,email,country,university,loan_amount,student_name,co_applicant,occupation,source,remarks,login_city,sanction_city,credit_score,status,assigned_to) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [lead.name,lead.phone,lead.email,lead.country,lead.university,lead.loanAmount,lead.studentName,lead.coApplicant,lead.occupation,lead.source,lead.remarks,lead.loginCity,lead.sanctionCity,lead.creditScore,lead.status,lead.assignedTo]);
      imported.push(result.insertId);
    } catch (error) { errors.push({ row: index + 2, message: error.message }); }
  }
  res.status(201).json({ imported: imported.length, skipped: errors.length, errors });
});
exports.update = asyncHandler(async (req, res) => { const id=Number(req.params.id); const [found]=await pool.execute('SELECT id FROM leads WHERE id=?',[id]); if(!found[0])throw new AppError('Lead not found',404); const lead=payload(req.body); await checkAssignee(lead.assignedTo); await pool.execute(`UPDATE leads SET name=?,phone=?,email=?,country=?,university=?,loan_amount=?,student_name=?,co_applicant=?,occupation=?,source=?,remarks=?,login_city=?,sanction_city=?,credit_score=?,status=?,assigned_to=? WHERE id=?`,[lead.name,lead.phone,lead.email,lead.country,lead.university,lead.loanAmount,lead.studentName,lead.coApplicant,lead.occupation,lead.source,lead.remarks,lead.loginCity,lead.sanctionCity,lead.creditScore,lead.status,lead.assignedTo,id]); const [rows]=await pool.execute(`SELECT ${leadColumns} FROM leads l LEFT JOIN users u ON u.id=l.assigned_to WHERE l.id=?`,[id]);res.json({lead:rows[0]}); });
exports.remove = asyncHandler(async (req,res)=>{const [result]=await pool.execute('DELETE FROM leads WHERE id=?',[Number(req.params.id)]);if(!result.affectedRows)throw new AppError('Lead not found',404);res.json({ok:true});});
