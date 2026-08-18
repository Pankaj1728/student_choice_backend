const router = require('express').Router();
const controller = require('../controllers/file-update.controller');
const { authenticate, allow } = require('../middleware/auth');

router.use(authenticate);
router.get('/', allow('leads.view', 'leads.manage', 'calling.view', 'calling.manage', 'files.view'), controller.list);
router.get('/:id', allow('leads.view', 'leads.manage', 'calling.view', 'calling.manage', 'files.view'), controller.get);
router.post('/', allow('leads.manage', 'leads.view', 'calling.view', 'calling.manage', 'files.view'), controller.create);
router.patch('/:id', allow('leads.manage', 'leads.view', 'calling.view', 'calling.manage', 'files.view'), controller.update);
router.delete('/:id', allow('leads.manage'), controller.remove);

module.exports = router;
