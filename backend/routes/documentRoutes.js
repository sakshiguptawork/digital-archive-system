const express = require('express');
const {
  createDocument,
  getDocuments,
  getDocumentById,
  updatePreservation,
  deleteDocument,
  createAnnotation,
  getMyAnnotations,
  deleteAnnotation
} = require('../controllers/documentController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Static annotation routes must be declared before /:id routes
router.get(
  '/annotations/my',
  protect,
  authorizeRoles('researcher'),
  getMyAnnotations
);

router.delete(
  '/annotations/:annotationId',
  protect,
  authorizeRoles('researcher'),
  deleteAnnotation
);

router
  .route('/')
  .get(protect, getDocuments)
  .post(
    protect,
    authorizeRoles('archivist'),
    upload.single('file'),
    createDocument
  );

router.get('/:id', protect, getDocumentById);

router.put(
  '/:id/preservation',
  protect,
  authorizeRoles('archivist'),
  updatePreservation
);

router.delete('/:id', protect, authorizeRoles('archivist'), deleteDocument);

router.post(
  '/:id/annotations',
  protect,
  authorizeRoles('researcher'),
  createAnnotation
);

module.exports = router;
