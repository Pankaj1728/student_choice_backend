const PfUpdateModel = require('../models/pf-update.model');
const pool = require('../config/db');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const search = req.query.search || '';

  const { pfs, total } = await PfUpdateModel.findAll({ page, limit, search });

  res.json({
    pfs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1)
    }
  });
});

exports.get = asyncHandler(async (req, res) => {
  const pf = await PfUpdateModel.findById(Number(req.params.id));
  if (!pf) throw new AppError('PF record not found', 404);
  res.json({ pf });
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const leadId = Number(b.lead_id || b.leadId);
  if (!leadId) throw new AppError('lead_id is required', 422);

  const pf = await PfUpdateModel.upsert(leadId, b);
  res.status(201).json({ pf });
});

exports.update = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  const b = req.body;

  let leadId = Number(b.lead_id || b.leadId);
  if (!leadId) {
    const [found] = await pool.execute(
      'SELECT l.id AS lead_id FROM leads l LEFT JOIN pf_updates pu ON pu.lead_id = l.id WHERE l.id=? OR fu.id=? OR pu.id=?',
      [targetId, targetId, targetId]
    );
    if (!found[0]) throw new AppError('Lead record not found', 404);
    leadId = found[0].lead_id;
  }

  const pf = await PfUpdateModel.upsert(leadId, b);
  res.json({ pf });
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await PfUpdateModel.remove(Number(req.params.id));
  if (!ok) throw new AppError('PF record not found', 404);
  res.json({ ok: true });
});
