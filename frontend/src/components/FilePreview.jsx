import { useState } from 'react';
import { buildFileUrl } from '../services/api';
import {
  formatArchivalCitation,
  isEmbeddablePreview,
  isImageFile
} from '../utils/documentHelpers';

const FilePreview = ({ document, openButtonLabel = 'Open Original Document' }) => {
  const [copied, setCopied] = useState(false);

  if (!document) return null;

  const fullUrl = buildFileUrl(document.fileUrl);

  const handleCopyCitation = async () => {
    try {
      await navigator.clipboard.writeText(formatArchivalCitation(document));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable in restricted contexts
    }
  };

  if (!fullUrl) {
    return (
      <div className="alert alert-error">
        File URL is unavailable until access is approved.
      </div>
    );
  }

  return (
    <>
      <div className="btn-row">
        <a
          href={fullUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary"
        >
          {openButtonLabel}
        </a>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleCopyCitation}
        >
          {copied ? 'Citation Copied' : 'Copy Citation'}
        </button>
      </div>

      {isImageFile(fullUrl) && (
        <img src={fullUrl} alt={document.title} className="preview-img" />
      )}

      {isEmbeddablePreview(fullUrl) && (
        <iframe
          src={fullUrl}
          title={document.title}
          className="preview-frame"
        />
      )}
    </>
  );
};

export default FilePreview;
