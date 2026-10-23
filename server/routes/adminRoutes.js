const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/timetable', authenticateToken, isAdmin, adminController.addTimetable);
router.post('/block', authenticateToken, isAdmin, adminController.blockResource);
router.post('/timetable/sync', authenticateToken, isAdmin, adminController.syncTimetable);
router.post('/timetable/upload', authenticateToken, isAdmin, upload.single('file'), adminController.uploadTimetableExcel);
router.post('/seed', adminController.seedData);
router.get('/users', authenticateToken, isAdmin, adminController.getUsers);
router.delete('/users/:id', authenticateToken, isAdmin, adminController.deleteUser);

module.exports = router;

