const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/serviceOrderController');

router.post('/from-budget/:budgetId', ctrl.createFromBudget);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.put('/:id/status', ctrl.updateStatus);

module.exports = router;
