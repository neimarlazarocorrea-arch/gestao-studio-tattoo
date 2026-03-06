const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/income-expense', reportController.getIncomeExpenseReport);
router.get('/cash-flow', reportController.getCashFlowReport);
router.get('/category', reportController.getCategoryReport);
router.get('/budgets', reportController.getBudgetReport);
router.get('/summary', reportController.getFinancialSummary);
router.get('/export/income-expense', reportController.exportIncomeExpenseCSV);
router.get('/export/category', reportController.exportCategoryCSV);
router.get('/export/budgets', reportController.exportBudgetCSV);
router.get('/export/summary', reportController.exportSummaryCSV);

module.exports = router;
