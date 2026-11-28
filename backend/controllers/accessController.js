const AccessRequest = require('../models/AccessRequest');
const Document = require('../models/Document');

const VALID_REVIEW_STATUSES = ['approved', 'rejected'];

/**
 * @desc    Submit an access request for a restricted document
 * @route   POST /api/access
 * @access  Private (Researcher only)
 */
const createAccessRequest = async (req, res, next) => {
  try {
    const documentId = req.body.documentId || req.body.document;
    const { reason } = req.body;

    if (!documentId || !reason || !String(reason).trim()) {
      return res.status(400).json({
        message: 'Document ID and reason for access are required'
      });
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.accessLevel !== 'restricted') {
      return res.status(400).json({
        message: 'Public documents do not require an access request'
      });
    }

    const existingActiveRequest = await AccessRequest.findOne({
      researcher: req.user._id,
      document: document._id,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingActiveRequest) {
      return res.status(409).json({
        message: `You already have a ${existingActiveRequest.status} access request for this document`
      });
    }

    const accessRequest = await AccessRequest.create({
      researcher: req.user._id,
      document: document._id,
      reason: String(reason).trim(),
      status: 'pending'
    });

    const populated = await accessRequest.populate([
      { path: 'researcher', select: 'name email role' },
      { path: 'document', select: 'title category historicalEra accessLevel' }
    ]);

    return res.status(201).json(populated);
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Retrieve access requests (all for Archivist, own requests for Researcher)
 * @route   GET /api/access
 * @access  Private (Archivist or Researcher)
 */
const getAccessRequests = async (req, res, next) => {
  try {
    const filter =
      req.user.role === 'archivist' ? {} : { researcher: req.user._id };

    const requests = await AccessRequest.find(filter)
      .populate('researcher', 'name email role')
      .populate(
        'document',
        'title category historicalEra accessLevel preservationFormat preservationStatus fileUrl'
      )
      .sort({ createdAt: -1 })
      .lean();

    // Prevent exposing restricted fileUrl to researchers before approval
    const sanitized = requests.map((item) => {
      if (
        req.user.role === 'researcher' &&
        item.status !== 'approved' &&
        item.document
      ) {
        return {
          ...item,
          document: {
            ...item.document,
            fileUrl: null
          }
        };
      }
      return item;
    });

    return res.status(200).json(sanitized);
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Approve or reject a researcher's access request
 * @route   PUT /api/access/:id
 * @access  Private (Archivist only)
 */
const updateAccessRequestStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !VALID_REVIEW_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${VALID_REVIEW_STATUSES.join(', ')}`
      });
    }

    const accessRequest = await AccessRequest.findById(req.params.id);
    if (!accessRequest) {
      return res.status(404).json({ message: 'Access request not found' });
    }

    accessRequest.status = status;
    accessRequest.reviewedBy = req.user._id;
    await accessRequest.save();

    const populated = await accessRequest.populate([
      { path: 'researcher', select: 'name email role' },
      { path: 'document', select: 'title category historicalEra accessLevel' }
    ]);

    return res.status(200).json(populated);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createAccessRequest,
  getAccessRequests,
  updateAccessRequestStatus
};
