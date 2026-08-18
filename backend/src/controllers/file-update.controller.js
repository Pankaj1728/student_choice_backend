const FileUpdateModel = require('../models/file-update.model');
const pool = require('../config/db');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const search = req.query.search || '';

  const { files, total } = await FileUpdateModel.findAll({ page, limit, search });

  res.json({
    files,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1)
    }
  });
});

exports.get = asyncHandler(async (req, res) => {
  const file = await FileUpdateModel.findById(Number(req.params.id));
  if (!file) throw new AppError('File update record not found', 404);
  res.json({ file });
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const leadId = Number(b.lead_id || b.leadId);
  if (!leadId) throw new AppError('lead_id is required', 422);

  const file = await FileUpdateModel.upsert(leadId, b);
  res.status(201).json({ file });
});

exports.update = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  const b = req.body;

  let leadId = Number(b.lead_id || b.leadId);
  if (!leadId) {
    const [found] = await pool.execute(
      'SELECT l.id AS lead_id FROM leads l LEFT JOIN file_updates fu ON fu.lead_id = l.id WHERE l.id=? OR fu.id=?',
      [targetId, targetId]
    );
    if (!found[0]) throw new AppError('Lead record not found', 404);
    leadId = found[0].lead_id;
  }

  const file = await FileUpdateModel.upsert(leadId, b);
  res.json({ file });
});

exports.remove = asyncHandler(async (req, res) => {
  const ok = await FileUpdateModel.remove(Number(req.params.id));
  if (!ok) throw new AppError('File update record not found', 404);
  res.json({ ok: true });
});
