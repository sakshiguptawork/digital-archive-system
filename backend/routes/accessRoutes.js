const express = require('express');
const {
  createAccessRequest,
  getAccessRequests,
  updateAccessRequestStatus
} = require('../controllers/accessController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router
  .route('/')
  .post(protect, authorizeRoles('researcher'), createAccessRequest)
  .get(protect, authorizeRoles('archivist', 'researcher'), getAccessRequests);

router.put(
  '/:id',
  protect,
  authorizeRoles('archivist'),
  updateAccessRequestStatus
);

module.exports = router;
