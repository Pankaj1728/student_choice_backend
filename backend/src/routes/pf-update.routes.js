const router = require('express').Router();
const controller = require('../controllers/pf-update.controller');
const { authenticate, allow } = require('../middleware/auth');

router.use(authenticate);
router.get('/', allow('leads.view', 'leads.manage', 'calling.view', 'calling.manage'), controller.list);
router.get('/:id', allow('leads.view', 'leads.manage', 'calling.view', 'calling.manage'), controller.get);
router.post('/', allow('leads.manage', 'leads.view', 'calling.view', 'calling.manage'), controller.create);
router.patch('/:id', allow('leads.manage', 'leads.view', 'calling.view', 'calling.manage'), controller.update);
router.delete('/:id', allow('leads.manage'), controller.remove);

module.exports = router;
