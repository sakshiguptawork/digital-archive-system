import { useEffect, useState } from 'react';
import FilePreview from '../components/FilePreview';
import { CATEGORIES } from '../constants/archiveOptions';
import api, { getErrorMessage } from '../services/api';
import { getPreservationBadgeClass } from '../utils/documentHelpers';

const PublicDashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Search filters
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('All');
  const [historicalEra, setHistoricalEra] = useState('');

  // Feedback form
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const showAlert = (type, text) => {
    setStatusMessage({ type, text });
  };

  const fetchPublicDocuments = async (filters = {}) => {
    const params = {};
    const kw = filters.keyword ?? keyword;
    const cat = filters.category ?? category;
    const era = filters.historicalEra ?? historicalEra;

    if (kw.trim()) params.keyword = kw.trim();
    if (cat && cat !== 'All') params.category = cat;
    if (era.trim()) params.historicalEra = era.trim();

    const { data } = await api.get('/documents', { params });
    setDocuments(data);
    if (data.length > 0) {
      setSelectedDoc((prev) =>
        prev && data.some((d) => d._id === prev._id) ? prev : data[0]
      );
    } else {
      setSelectedDoc(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [, fbRes] = await Promise.all([
        fetchPublicDocuments(),
        api.get('/feedback')
      ]);
      setFeedbacks(fbRes.data);
    } catch (err) {
      showAlert('error', getErrorMessage(err, 'Failed to load public archive.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });
    try {
      await fetchPublicDocuments();
    } catch (err) {
      showAlert('error', getErrorMessage(err, 'Search failed.'));
    }
  };

  const handleReset = async () => {
    setKeyword('');
    setCategory('All');
    setHistoricalEra('');
    try {
      await fetchPublicDocuments({
        keyword: '',
        category: 'All',
        historicalEra: ''
      });
    } catch (err) {
      showAlert('error', getErrorMessage(err, 'Unable to reset search.'));
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });

    if (!message.trim()) {
      showAlert('error', 'Please enter your feedback comments before submitting.');
      return;
    }

    setSubmittingFeedback(true);
    try {
      const { data } = await api.post('/feedback', {
        rating,
        message
      });
      setFeedbacks((prev) => [data, ...prev]);
      setMessage('');
      setRating(5);
      showAlert('success', 'Thank you! Your archive feedback has been recorded.');
    } catch (err) {
      showAlert('error', getErrorMessage(err, 'Failed to submit feedback.'));
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Public Historical Archive</h1>
          <p>
            Explore verified public historical records, inspect archival
            metadata, and share community feedback.
          </p>
        </div>
      </div>

      {statusMessage.text && (
        <div
          className={`alert ${
            statusMessage.type === 'error' ? 'alert-error' : 'alert-success'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* 1. Public Document Search & 2. Document Viewer */}
      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div>
            <h2>Public Document Search</h2>
            <p className="card-subtitle">
              Browse openly accessible collections by keyword, category, or
              historical era.
            </p>
          </div>
        </div>

        <form className="filter-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search public records by title or description..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Historical era..."
            value={historicalEra}
            onChange={(e) => setHistoricalEra(e.target.value)}
          />
          <div className="btn-row">
            <button type="submit" className="btn btn-primary">
              Search
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </form>

        <div className="split-layout">
          <div>
            {loading ? (
              <p className="muted-text">Loading public records...</p>
            ) : documents.length === 0 ? (
              <div className="empty-state">
                No public historical documents matched your search.
              </div>
            ) : (
              <div className="doc-grid">
                {documents.map((doc) => (
                  <article
                    key={doc._id}
                    className={`doc-card ${
                      selectedDoc?._id === doc._id ? 'selected' : ''
                    }`}
                  >
                    <div className="stack" style={{ gap: '0.45rem' }}>
                      <div className="doc-meta-row">
                        <span className="badge badge-public">Public</span>
                        <span className="badge badge-era">{doc.category}</span>
                      </div>
                      <h3 className="doc-card-title">{doc.title}</h3>
                      <p className="doc-card-desc">{doc.description}</p>
                    </div>

                    <div
                      className="btn-row"
                      style={{ justifyContent: 'space-between' }}
                    >
                      <span className="muted-text">{doc.historicalEra}</span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedDoc(doc)}
                      >
                        Inspect Record
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* 2. Metadata Inspection Panel & Direct File Viewer */}
          <aside className="card" style={{ background: '#fcfaf5' }}>
            <div className="card-header">
              <div>
                <h2>Document Viewer</h2>
                <p className="card-subtitle">
                  Metadata inspection &amp; direct archival file access
                </p>
              </div>
            </div>

            {!selectedDoc ? (
              <div className="empty-state">
                Select a public document to inspect its metadata and open the
                file.
              </div>
            ) : (
              <div className="stack">
                <div>
                  <h3 style={{ fontSize: '1.15rem' }}>{selectedDoc.title}</h3>
                  <div className="muted-text" style={{ marginTop: '0.25rem' }}>
                    {selectedDoc.category} &bull; {selectedDoc.historicalEra}
                  </div>
                </div>

                <div className="doc-meta-row">
                  <span className="badge badge-neutral">
                    Format: {selectedDoc.preservationFormat}
                  </span>
                  <span
                    className={`badge ${getPreservationBadgeClass(
                      selectedDoc.preservationStatus
                    )}`}
                  >
                    {selectedDoc.preservationStatus}
                  </span>
                </div>

                <p style={{ fontSize: '0.92rem' }}>{selectedDoc.description}</p>

                <div className="muted-text">
                  Curated by {selectedDoc.uploadedBy?.name || 'Archive Staff'} on{' '}
                  {new Date(selectedDoc.createdAt).toLocaleDateString()}
                </div>

                <FilePreview
                  document={selectedDoc}
                  openButtonLabel="Open Direct File Viewer"
                />
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* 3. Feedback Submission */}
      <div className="split-layout">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Archive Feedback</h2>
              <p className="card-subtitle">
                Rate your archival research experience and leave comments for
                our curatorial team.
              </p>
            </div>
          </div>

          <form className="stack" onSubmit={handleFeedbackSubmit}>
            <div className="form-group">
              <label>Rating (1 to 5 Stars)</label>
              <div className="star-picker" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    className={`star-btn ${star <= rating ? 'active' : ''}`}
                    onClick={() => setRating(star)}
                  >
                    &#9733;
                  </button>
                ))}
                <span className="muted-text" style={{ marginLeft: '0.5rem' }}>
                  {rating} / 5
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="feedback-message">Comments</label>
              <textarea
                id="feedback-message"
                required
                placeholder="Share suggestions, transcription requests, or thoughts on document clarity..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-accent"
              disabled={submittingFeedback}
            >
              {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2>Community Feedback</h2>
              <p className="card-subtitle">
                Recent reviews from visitors and public historians
              </p>
            </div>
          </div>

          {feedbacks.length === 0 ? (
            <div className="empty-state">
              No feedback submitted yet. Be the first to share your thoughts!
            </div>
          ) : (
            <div className="stack">
              {feedbacks.map((fb) => (
                <div key={fb._id} className="note-item">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      marginBottom: '0.3rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    <strong>{fb.userName}</strong>
                    <span style={{ color: '#d97706', fontWeight: 700 }}>
                      {'★'.repeat(fb.rating)}
                      {'☆'.repeat(5 - fb.rating)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem' }}>{fb.message}</p>
                  <div className="muted-text" style={{ marginTop: '0.3rem' }}>
                    {new Date(fb.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default PublicDashboard;
