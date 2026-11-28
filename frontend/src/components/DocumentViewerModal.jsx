import FilePreview from './FilePreview';
import {
  getAccessBadgeClass,
  getPreservationBadgeClass
} from '../utils/documentHelpers';

const DocumentViewerModal = ({ document, onClose }) => {
  if (!document) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Document Metadata and Viewer"
      onClick={onClose}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div>
            <h2>{document.title}</h2>
            <p className="card-subtitle">
              {document.category} &bull; {document.historicalEra}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="doc-meta-row" style={{ marginBottom: '0.9rem' }}>
          <span className={`badge ${getAccessBadgeClass(document.accessLevel)}`}>
            {document.accessLevel === 'restricted' ? 'Restricted' : 'Public'}
          </span>
          <span className="badge badge-neutral">
            Format: {document.preservationFormat}
          </span>
          <span
            className={`badge ${getPreservationBadgeClass(
              document.preservationStatus
            )}`}
          >
            {document.preservationStatus}
          </span>
        </div>

        <p style={{ marginBottom: '1rem' }}>{document.description}</p>

        <div className="muted-text" style={{ marginBottom: '1rem' }}>
          Archived by {document.uploadedBy?.name || 'Archive Staff'} &bull;{' '}
          {new Date(document.createdAt).toLocaleDateString()}
        </div>

        <FilePreview document={document} />
      </div>
    </div>
  );
};

export default DocumentViewerModal;
