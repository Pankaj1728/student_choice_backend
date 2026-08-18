const router = require('express').Router();
const controller = require('../controllers/sanction.controller');
const { authenticate, allow } = require('../middleware/auth');

router.use(authenticate);
router.get('/', allow('leads.view', 'leads.manage', 'calling.view', 'calling.manage'), controller.list);
router.get('/lead/:leadId', allow('leads.view', 'leads.manage', 'calling.view', 'calling.manage'), controller.getByLeadId);
router.patch('/lead/:leadId', allow('leads.manage', 'leads.view', 'calling.view', 'calling.manage'), controller.updateByLeadId);
router.get('/:id', allow('leads.view', 'leads.manage', 'calling.view', 'calling.manage'), controller.get);
router.post('/', allow('leads.manage', 'leads.view', 'calling.view', 'calling.manage'), controller.create);
router.patch('/:id', allow('leads.manage', 'leads.view', 'calling.view', 'calling.manage'), controller.update);
router.delete('/:id', allow('leads.manage'), controller.remove);

module.exports = router;
