const express = require('express');
const router = express.Router();
const receivablesController = require('../controllers/receivablesController');

router.get('/report', receivablesController.getReport);
router.get('/pending', receivablesController.getPending);
router.get('/overdue', receivablesController.getOverdue);

module.exports = router;
