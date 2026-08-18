const express = require('express');
const router = express.Router();
const controller = require('../controllers/cross-sales.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
