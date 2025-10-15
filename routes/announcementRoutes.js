const express = require('express');
const router = express.Router();
const {
  getAllAnnouncements,
  getActiveAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementStatus
} = require('../controllers/announcementController');
const { Protect, allowedTo } = require('../controllers/authController');

// Public routes
router.get('/active', getActiveAnnouncements);

// Protected admin routes
router.use(Protect);
router.use(allowedTo('admin'));

router.route('/')
  .get(getAllAnnouncements)
  .post(createAnnouncement);

router.route('/:id')
  .get(getAnnouncement)
  .put(updateAnnouncement)
  .delete(deleteAnnouncement);

router.patch('/:id/toggle', toggleAnnouncementStatus);

module.exports = router;
