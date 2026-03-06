const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');

router.post('/', receiptController.create);
router.get('/', receiptController.list);
router.get('/:id', receiptController.get);
router.get('/budget/:budgetId', receiptController.getByBudget);
router.get('/transaction/:transactionId', receiptController.getByTransaction);
router.delete('/:id', receiptController.remove);

module.exports = router;
