const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');

router.post('/', reminderController.create);
router.get('/', reminderController.list);
router.get('/pending', reminderController.getPending);
router.post('/generate', reminderController.generateReminders);
router.get('/:id', reminderController.getById);
router.patch('/:id/status', reminderController.updateStatus);
router.delete('/:id', reminderController.remove);

module.exports = router;
