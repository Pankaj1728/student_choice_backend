const DisbursementModel = require('../models/disbursement.model');
const pool = require('../config/db');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const search = req.query.search || '';

  const { disbursements, total } = await DisbursementModel.findAll({ page, limit, search });

  res.json({
    disbursements,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1)
    }
  });
});

exports.get = asyncHandler(async (req, res) => {
  const disbursement = await DisbursementModel.findById(Number(req.params.id));
  if (!disbursement) throw new AppError('Disbursement record not found', 404);
  res.json({ disbursement });
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const leadId = Number(b.lead_id || b.leadId);
  if (!leadId) throw new AppError('lead_id is required', 422);

  const disbursement = await DisbursementModel.upsert(leadId, b);
  res.status(201).json({ disbursement });
});

exports.update = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  const b = req.body;

  let leadId = Number(b.lead_id || b.leadId);
  if (!leadId) {
    const [found] = await pool.execute(
      'SELECT l.id AS lead_id FROM leads l LEFT JOIN disbursements d ON d.lead_id = l.id WHERE l.id=? OR d.id=?',
      [targetId, targetId]
    );
    if (!found[0]) throw new AppError('Lead record not found', 404);
    leadId = found[0].lead_id;
  }

  const disbursement = await DisbursementModel.upsert(leadId, b);
  res.json({ disbursement });
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await DisbursementModel.remove(Number(req.params.id));
  if (!ok) throw new AppError('Disbursement record not found', 404);
  res.json({ ok: true });
});
