const router = require('express').Router();
const controller = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const superAdmin = require('../middleware/super-admin');
router.use(authenticate, superAdmin);
router.get('/', controller.list); router.post('/', controller.create); router.patch('/:id', controller.update); router.delete('/:id', controller.remove);
module.exports = router;
