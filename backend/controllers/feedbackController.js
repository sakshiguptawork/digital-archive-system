const Feedback = require('../models/Feedback');

/**
 * @desc    Submit public archive feedback and star rating
 * @route   POST /api/feedback
 * @access  Private
 */
const createFeedback = async (req, res, next) => {
  try {
    const { message, rating } = req.body;
    const numericRating = Number(rating);

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        message: 'Feedback message is required'
      });
    }

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        message: 'Rating must be an integer between 1 and 5'
      });
    }

    const feedback = await Feedback.create({
      user: req.user._id,
      userName: req.user.name,
      message: String(message).trim(),
      rating: numericRating
    });

    return res.status(201).json(feedback);
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Retrieve public archive feedback entries
 * @route   GET /api/feedback
 * @access  Public / Authenticated
 */
const getFeedbacks = async (_req, res, next) => {
  try {
    const feedbacks = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json(feedbacks);
  } catch (error) {
    return next(error);
  }
};

module.exports = { createFeedback, getFeedbacks };
