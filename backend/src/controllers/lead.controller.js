const LeadModel = require('../models/lead.model');
const pool = require('../config/db');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');

const statuses = ['new', 'interested', 'file_update', 'login', 'sanction', 'pf_paid', 'disbursed', 'rejected'];

function cleanString(value) { return String(value || '').trim(); }

function payload(body) {
  const record = {
    name: cleanString(body.name), phone: cleanString(body.phone), email: cleanString(body.email), country: cleanString(body.country), university: cleanString(body.university), loanAmount: Number(body.loanAmount) || 0,
    studentName: cleanString(body.studentName), coApplicant: cleanString(body.coApplicant), occupation: cleanString(body.occupation), source: cleanString(body.source) || 'Direct', remarks: cleanString(body.remarks), loginCity: cleanString(body.loginCity), sanctionCity: cleanString(body.sanctionCity), creditScore: body.creditScore === '' || body.creditScore == null ? null : Number(body.creditScore), entranceExam: cleanString(body.entranceExam || body.entrance_exam), status: cleanString(body.status) || 'new', assignedTo: body.assignedTo ? Number(body.assignedTo) : null
  };
  if (!record.name || !record.phone) throw new AppError('Lead name and phone number are required', 422);
  if (!statuses.includes(record.status)) throw new AppError('Select a valid lead status', 422);
  if (record.creditScore !== null && (!Number.isInteger(record.creditScore) || record.creditScore < 300 || record.creditScore > 900)) throw new AppError('Credit score must be between 300 and 900', 422);
  return record;
}

async function checkAssignee(id) {
  if (!id) return;
  const [users] = await pool.execute('SELECT id FROM users WHERE id=? AND is_active=1', [id]);
  if (!users[0]) throw new AppError('Assigned user is invalid or inactive', 422);
}

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const search = req.query.search || '';
  const status = req.query.status || '';
  const source = req.query.source || '';
  const assignedTo = req.query.assignedTo || null;

  const { leads, total } = await LeadModel.findAll({ page, limit, search, status, source, assignedTo });

  res.json({
    leads,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1)
    }
  });
});

exports.get = asyncHandler(async (req, res) => {
  const lead = await LeadModel.findById(Number(req.params.id));
  if (!lead) throw new AppError('Lead not found', 404);
  res.json({ lead });
});

exports.meta = asyncHandler(async (_req, res) => {
  const [sources] = await pool.query('SELECT DISTINCT source FROM leads WHERE source <> \'\' ORDER BY source');
  const [users] = await pool.query('SELECT id,name,email FROM users WHERE is_active=1 ORDER BY name');
  res.json({ statuses, sources: sources.map(row => row.source), users });
});

exports.create = asyncHandler(async (req, res) => {
  const leadData = payload(req.body);
  await checkAssignee(leadData.assignedTo);
  const lead = await LeadModel.create(leadData);
  res.status(201).json({ lead });
});

exports.bulkCreate = asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.leads) ? req.body.leads.slice(0, 500) : [];
  if (!items.length) throw new AppError('Upload a CSV with at least one lead', 422);
  const imported = []; const errors = [];
  for (let index = 0; index < items.length; index += 1) {
    try {
      const leadData = payload(items[index]);
      await checkAssignee(leadData.assignedTo);
      const lead = await LeadModel.create(leadData);
      imported.push(lead.id);
    } catch (error) { errors.push({ row: index + 2, message: error.message }); }
  }
  res.status(201).json({ imported: imported.length, skipped: errors.length, errors });
});

exports.update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const found = await LeadModel.findById(id);
  if (!found) throw new AppError('Lead not found', 404);

  const leadData = payload(req.body);
  await checkAssignee(leadData.assignedTo);

  const lead = await LeadModel.update(id, leadData);
  res.json({ lead });
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await LeadModel.remove(Number(req.params.id));
  if (!ok) throw new AppError('Lead not found', 404);
  res.json({ ok: true });
});
