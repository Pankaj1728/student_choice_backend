const AppError = require('../utils/app-error');

module.exports = (req, _res, next) => {
  if (req.user.role_key !== 'super_admin') return next(new AppError('Super Admin access is required', 403));
  next();
};
