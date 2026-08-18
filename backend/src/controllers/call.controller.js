const CallModel = require('../models/call.model');
const pool = require('../config/db');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');

const statuses = ['pending', 'connected', 'not_answered', 'interested', 'follow_up', 'not_interested', 'wrong_number', 'completed'];
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

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const search = req.query.search || '';
  const status = req.query.status || '';
  const assignedTo = req.query.assignedTo || null;

  const { calls, total } = await CallModel.findAll({ page, limit, search, status, assignedTo, user: req.user });

  res.json({
    calls,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1)
    }
  });
});

exports.stats = asyncHandler(async (req, res) => {
  const resStats = await CallModel.stats(req.query.assignedTo, req.user);
  res.json(resStats);
});

exports.meta = asyncHandler(async (_req, res) => {
  const [users] = await pool.query('SELECT id,name FROM users WHERE is_active=1 ORDER BY name');
  const [leads] = await pool.query('SELECT id,name,phone FROM leads ORDER BY created_at DESC LIMIT 500');
  res.json({ statuses, users, leads });
});

exports.create = asyncHandler(async (req, res) => {
  const item = data(req.body);
  await validUser(item.assignedTo);
  await validLead(item.leadId);
  try {
    const call = await CallModel.create(item);
    res.status(201).json({ call });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('This number is already assigned to a user', 409);
    throw error;
  }
});

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
  const canCreate = req.user.permissions?.includes('leads.manage') || req.user.permissions?.includes('calling.manage') || req.user.permissions?.includes('calling.view') || req.user.role_key === 'loan_advisor';
  if (!canCreate) throw new AppError('You do not have permission to create leads', 403);
  const id = Number(req.params.id);
  const assignedTo = req.body.assignedTo ? Number(req.body.assignedTo) : null;
  const lead = {
    name: trim(req.body.name), phone: normalizePhone(req.body.phone), email: trim(req.body.email), country: trim(req.body.country), university: trim(req.body.university), loanAmount: Number(req.body.loanAmount) || 0,
    studentName: trim(req.body.studentName), coApplicant: trim(req.body.coApplicant), occupation: trim(req.body.occupation), source: trim(req.body.source) || 'Direct', remarks: trim(req.body.remarks), loginCity: trim(req.body.loginCity), sanctionCity: trim(req.body.sanctionCity), creditScore: req.body.creditScore === '' || req.body.creditScore == null ? null : Number(req.body.creditScore), entranceExam: trim(req.body.entranceExam || req.body.entrance_exam), status: trim(req.body.status) || 'new'
  };
  if (!lead.name || !lead.phone) throw new AppError('Lead name and phone number are required', 422);
  if (lead.creditScore !== null && (!Number.isInteger(lead.creditScore) || lead.creditScore < 300 || lead.creditScore > 900)) throw new AppError('Credit score must be between 300 and 900', 422);

  const [calls] = await pool.execute('SELECT id,lead_id,assigned_to,customer_name,phone,call_count FROM calls WHERE id=?', [id]);
  const call = calls[0];
  if (!call) throw new AppError('Call record not found', 404);
  if (call.lead_id) throw new AppError('This call has already been converted to a lead', 409);
  const finalAssignee = assignedTo || call.assigned_to || req.user.id;
  if (finalAssignee) {
    await validUser(finalAssignee);
  }

  const createdLead = await CallModel.convertToLead(id, lead, finalAssignee);
  res.status(201).json({ lead: createdLead });
});

exports.update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const foundCall = await CallModel.findById(id);
  if (!foundCall) throw new AppError('Call record not found', 404);

  if (!req.user.permissions.includes('calling.manage') && req.user.role_key === 'loan_advisor') {
    if (foundCall.assigned_to !== req.user.id) {
      throw new AppError('You can only update calls assigned to you', 403);
    }
  }
  const bodyData = {
    ...req.body,
    phone: req.body.phone || foundCall.phone,
    customerName: req.body.customerName || foundCall.customer_name,
    assignedTo: req.body.assignedTo !== undefined ? req.body.assignedTo : foundCall.assigned_to,
    leadId: req.body.leadId !== undefined ? req.body.leadId : foundCall.lead_id,
    followUpAt: req.body.followUpAt !== undefined ? req.body.followUpAt : foundCall.follow_up_at,
    notes: req.body.notes !== undefined ? req.body.notes : foundCall.notes,
  };
  const item = data(bodyData);
  await validUser(item.assignedTo);
  await validLead(item.leadId);
  const wasCalled = req.body.markCalled !== undefined ? Boolean(req.body.markCalled) : true;

  const call = await CallModel.update(id, item, wasCalled);
  res.json({ call });
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await CallModel.remove(Number(req.params.id));
  if (!ok) throw new AppError('Call record not found', 404);
  res.json({ ok: true });
});
