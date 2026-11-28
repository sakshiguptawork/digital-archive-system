const express = require('express');
const {
  createFeedback,
  getFeedbacks
} = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(getFeedbacks).post(protect, createFeedback);

module.exports = router;
