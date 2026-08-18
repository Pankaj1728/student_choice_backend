const express = require('express');
const router = express.Router();
const controller = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/team-performance', controller.getTeamPerformance);

module.exports = router;
