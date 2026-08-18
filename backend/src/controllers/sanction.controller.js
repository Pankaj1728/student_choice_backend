const SanctionModel = require('../models/sanction.model');
const pool = require('../config/db');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const search = req.query.search || '';

  const { sanctions, total } = await SanctionModel.findAll({ page, limit, search });

  res.json({
    sanctions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1)
    }
  });
});

exports.get = asyncHandler(async (req, res) => {
  const sanction = await SanctionModel.findById(Number(req.params.id));
  if (!sanction) throw new AppError('Sanction record not found', 404);
  res.json({ sanction });
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const leadId = Number(b.lead_id || b.leadId);
  if (!leadId) throw new AppError('lead_id is required', 422);

  const sanction = await SanctionModel.upsert(leadId, { ...b, is_new: true });
  res.status(201).json({ sanction });
});

exports.update = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  const b = req.body;

  let leadId = Number(b.lead_id || b.leadId);
  if (!leadId) {
    const [found] = await pool.execute(
      'SELECT lead_id FROM sanction_files WHERE id=?',
      [targetId]
    );
    if (!found[0]) throw new AppError('Sanction record not found', 404);
    leadId = found[0].lead_id;
  }

  const sanction = await SanctionModel.upsert(leadId, b, targetId);
  res.json({ sanction });
});

exports.getByLeadId = asyncHandler(async (req, res) => {
  const leadId = Number(req.params.leadId);
  const data = await SanctionModel.findByLeadId(leadId);
  if (!data) throw new AppError('Sanction lead records not found', 404);
  res.json(data);
});

exports.updateByLeadId = asyncHandler(async (req, res) => {
  const leadId = Number(req.params.leadId);
  const { sanctions } = req.body;
  if (!Array.isArray(sanctions)) throw new AppError('sanctions array is required', 422);

  const updatedSanctions = [];
  for (const item of sanctions) {
    if (item._deleted && item.id) {
      await SanctionModel.remove(item.id);
    } else {
      const updated = await SanctionModel.upsert(leadId, item, item.id);
      updatedSanctions.push(updated);
    }
  }

  res.json({ ok: true, sanctions: updatedSanctions });
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await SanctionModel.remove(Number(req.params.id));
  if (!ok) throw new AppError('Sanction record not found', 404);
  res.json({ ok: true });
});
