const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const AccessRequest = require('../models/AccessRequest');
const Annotation = require('../models/Annotation');

const VALID_ACCESS_LEVELS = ['public', 'restricted'];
const VALID_PRESERVATION_STATUSES = ['Verified', 'Needs Migration', 'Digitized'];

/**
 * Escapes RegExp metacharacters from user search input.
 */
const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @desc    Upload and archive a new historical document
 * @route   POST /api/documents
 * @access  Private (Archivist only)
 */
const createDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Please upload a document file'
      });
    }

    const {
      title,
      description,
      category,
      historicalEra,
      accessLevel = 'public',
      preservationFormat = 'PDF/A',
      preservationStatus = 'Digitized'
    } = req.body;

    if (!title || !description || !category || !historicalEra) {
      // Remove uploaded file if metadata validation fails
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        message:
          'Title, description, category, and historical era are required'
      });
    }

    if (!VALID_ACCESS_LEVELS.includes(accessLevel)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        message: `Invalid accessLevel. Must be one of: ${VALID_ACCESS_LEVELS.join(', ')}`
      });
    }

    if (!VALID_PRESERVATION_STATUSES.includes(preservationStatus)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        message: `Invalid preservationStatus. Must be one of: ${VALID_PRESERVATION_STATUSES.join(', ')}`
      });
    }

    const document = await Document.create({
      title: String(title).trim(),
      description: String(description).trim(),
      category: String(category).trim(),
      historicalEra: String(historicalEra).trim(),
      accessLevel,
      preservationFormat: String(preservationFormat).trim() || 'PDF/A',
      preservationStatus,
      fileUrl: `/uploads/${req.file.filename}`,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
      uploadedBy: req.user._id
    });

    const populated = await document.populate('uploadedBy', 'name email role');

    return res.status(201).json(populated);
  } catch (error) {
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    return next(error);
  }
};

/**
 * @desc    Search and filter archived documents with role-based access enforcement
 * @route   GET /api/documents
 * @access  Private
 */
const getDocuments = async (req, res, next) => {
  try {
    const { keyword, category, historicalEra, accessLevel } = req.query;
    const filter = {};

    if (keyword && String(keyword).trim()) {
      const regex = new RegExp(escapeRegex(String(keyword).trim()), 'i');
      filter.$or = [{ title: regex }, { description: regex }];
    }

    if (category && String(category).trim() && category !== 'All') {
      filter.category = new RegExp(
        `^${escapeRegex(String(category).trim())}$`,
        'i'
      );
    }

    if (historicalEra && String(historicalEra).trim() && historicalEra !== 'All') {
      filter.historicalEra = new RegExp(
        escapeRegex(String(historicalEra).trim()),
        'i'
      );
    }

    // Automatically restrict public role users to public documents only
    if (req.user.role === 'public') {
      filter.accessLevel = 'public';
    } else if (
      accessLevel &&
      VALID_ACCESS_LEVELS.includes(String(accessLevel).toLowerCase())
    ) {
      filter.accessLevel = String(accessLevel).toLowerCase();
    }

    const documents = await Document.find(filter)
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    // For researchers, compute access rights and hide unapproved restricted file URLs
    if (req.user.role === 'researcher') {
      const researcherRequests = await AccessRequest.find({
        researcher: req.user._id
      })
        .sort({ createdAt: -1 })
        .lean();

      const latestRequestByDoc = new Map();
      for (const request of researcherRequests) {
        const docKey = String(request.document);
        if (!latestRequestByDoc.has(docKey)) {
          latestRequestByDoc.set(docKey, request);
        }
      }

      const enriched = documents.map((doc) => {
        const docId = String(doc._id);
        const latestRequest = latestRequestByDoc.get(docId);
        const isPublic = doc.accessLevel === 'public';
        const isApproved = latestRequest?.status === 'approved';
        const hasAccess = isPublic || isApproved;

        return {
          ...doc,
          fileUrl: hasAccess ? doc.fileUrl : null,
          hasAccess,
          accessRequestStatus: latestRequest ? latestRequest.status : null
        };
      });

      return res.status(200).json(enriched);
    }

    const withAccess = documents.map((doc) => ({
      ...doc,
      hasAccess: true
    }));

    return res.status(200).json(withAccess);
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Retrieve a single archived document with role-based access enforcement
 * @route   GET /api/documents/:id
 * @access  Private
 */
const getDocumentById = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name email role')
      .lean();

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (req.user.role === 'public' && document.accessLevel !== 'public') {
      return res.status(403).json({
        message: 'Forbidden: public users cannot access restricted documents'
      });
    }

    if (req.user.role === 'researcher' && document.accessLevel === 'restricted') {
      const latestRequest = await AccessRequest.findOne({
        researcher: req.user._id,
        document: document._id
      })
        .sort({ createdAt: -1 })
        .lean();

      const hasAccess = latestRequest?.status === 'approved';
      return res.status(200).json({
        ...document,
        fileUrl: hasAccess ? document.fileUrl : null,
        hasAccess,
        accessRequestStatus: latestRequest ? latestRequest.status : null
      });
    }

    return res.status(200).json({ ...document, hasAccess: true });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update preservation status and format of a document
 * @route   PUT /api/documents/:id/preservation
 * @access  Private (Archivist only)
 */
const updatePreservation = async (req, res, next) => {
  try {
    const { preservationStatus, preservationFormat } = req.body;

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (preservationStatus) {
      if (!VALID_PRESERVATION_STATUSES.includes(preservationStatus)) {
        return res.status(400).json({
          message: `Invalid preservationStatus. Must be one of: ${VALID_PRESERVATION_STATUSES.join(', ')}`
        });
      }
      document.preservationStatus = preservationStatus;
    }

    if (preservationFormat && String(preservationFormat).trim()) {
      document.preservationFormat = String(preservationFormat).trim();
    }

    await document.save();
    const populated = await document.populate('uploadedBy', 'name email role');

    return res.status(200).json(populated);
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Delete a document and its associated file, access requests, and annotations
 * @route   DELETE /api/documents/:id
 * @access  Private (Archivist only)
 */
const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Remove uploaded file from local storage if present
    if (document.fileUrl) {
      const filename = path.basename(document.fileUrl);
      const filePath = path.join(__dirname, '..', 'uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Failed to delete file ${filePath}: ${err.message}`);
          }
        });
      }
    }

    await Promise.all([
      AccessRequest.deleteMany({ document: document._id }),
      Annotation.deleteMany({ document: document._id }),
      document.deleteOne()
    ]);

    return res.status(200).json({
      message: 'Document and associated records removed successfully',
      deletedId: req.params.id
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Create a personal research annotation on an accessible document
 * @route   POST /api/documents/:id/annotations
 * @access  Private (Researcher only)
 */
const createAnnotation = async (req, res, next) => {
  try {
    const { noteText } = req.body;

    if (!noteText || !String(noteText).trim()) {
      return res.status(400).json({
        message: 'Annotation noteText is required'
      });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.accessLevel === 'restricted') {
      const approvedRequest = await AccessRequest.findOne({
        researcher: req.user._id,
        document: document._id,
        status: 'approved'
      });

      if (!approvedRequest) {
        return res.status(403).json({
          message:
            'You must have approved access to annotate a restricted document'
        });
      }
    }

    const annotation = await Annotation.create({
      researcher: req.user._id,
      document: document._id,
      noteText: String(noteText).trim()
    });

    const populated = await annotation.populate(
      'document',
      'title category historicalEra accessLevel'
    );

    return res.status(201).json(populated);
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Retrieve personal research annotations for the logged-in researcher
 * @route   GET /api/documents/annotations/my
 * @access  Private (Researcher only)
 */
const getMyAnnotations = async (req, res, next) => {
  try {
    const annotations = await Annotation.find({
      researcher: req.user._id
    })
      .populate('document', 'title category historicalEra accessLevel')
      .sort({ createdAt: -1 });

    return res.status(200).json(annotations);
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Delete one of the logged-in researcher's own annotations
 * @route   DELETE /api/documents/annotations/:annotationId
 * @access  Private (Researcher only)
 */
const deleteAnnotation = async (req, res, next) => {
  try {
    const annotation = await Annotation.findOne({
      _id: req.params.annotationId,
      researcher: req.user._id
    });

    if (!annotation) {
      return res.status(404).json({ message: 'Annotation not found' });
    }

    await annotation.deleteOne();
    return res.status(200).json({
      message: 'Annotation deleted successfully',
      deletedId: req.params.annotationId
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createDocument,
  getDocuments,
  getDocumentById,
  updatePreservation,
  deleteDocument,
  createAnnotation,
  getMyAnnotations,
  deleteAnnotation,
  escapeRegex
};
