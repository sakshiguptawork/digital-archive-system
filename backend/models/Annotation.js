const mongoose = require('mongoose');

const annotationSchema = new mongoose.Schema(
  {
    researcher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true
    },
    noteText: {
      type: String,
      required: [true, 'Annotation note text is required'],
      trim: true,
      maxlength: [3000, 'Note text cannot exceed 3000 characters']
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Annotation', annotationSchema);
