const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Document description is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Document category is required'],
      trim: true
    },
    historicalEra: {
      type: String,
      required: [true, 'Historical era is required'],
      trim: true
    },
    accessLevel: {
      type: String,
      enum: ['public', 'restricted'],
      default: 'public',
      required: true
    },
    preservationFormat: {
      type: String,
      required: [true, 'Preservation format is required'],
      trim: true,
      default: 'PDF/A'
    },
    preservationStatus: {
      type: String,
      enum: ['Verified', 'Needs Migration', 'Digitized'],
      default: 'Digitized'
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required']
    },
    originalFileName: {
      type: String,
      trim: true
    },
    mimeType: {
      type: String,
      trim: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

documentSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Document', documentSchema);
