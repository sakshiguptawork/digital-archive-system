import { useEffect, useState } from 'react';
import DocumentViewerModal from '../components/DocumentViewerModal';
import { CATEGORIES } from '../constants/archiveOptions';
import api, { getErrorMessage } from '../services/api';
import {
  getAccessBadgeClass,
  getRequestStatusBadgeClass
} from '../utils/documentHelpers';

const ResearcherDashboard = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [documents, setDocuments] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Search filters
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('All');
  const [historicalEra, setHistoricalEra] = useState('');

  // Viewing and access request modals
  const [viewingDoc, setViewingDoc] = useState(null);
  const [requestTarget, setRequestTarget] = useState(null);
  const [requestReason, setRequestReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Annotation form
  const [noteDocId, setNoteDocId] = useState('');
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const showAlert = (type, text) => {
    setStatusMessage({ type, text });
  };

  const fetchDocuments = async (filters = {}) => {
    const params = {};
    const kw = filters.keyword ?? keyword;
    const cat = filters.category ?? category;
    const era = filters.historicalEra ?? historicalEra;

    if (kw.trim()) params.keyword = kw.trim();
    if (cat && cat !== 'All') params.category = cat;
    if (era.trim()) params.historicalEra = era.trim();

    const { data } = await api.get('/documents', { params });
    setDocuments(data);

    const accessible = data.filter((d) => d.hasAccess);
    if (accessible.length > 0 && !accessible.some((d) => d._id === noteDocId)) {
      setNoteDocId(accessible[0]._id);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [, accessRes, notesRes] = await Promise.all([
        fetchDocuments(),
        api.get('/access'),
        api.get('/documents/annotations/my')
      ]);
      setAccessRequests(accessRes.data);
      setAnnotations(notesRes.data);
    } catch (err) {
      showAlert('error', getErrorMessage(err, 'Failed to load researcher workspace.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });
    try {
      await fetchDocuments();
    } catch (err) {
      showAlert('error', getErrorMessage(err, 'Search failed.'));
    }
  };

  const handleResetFilters = async () => {
    setKeyword('');
    setCategory('All');
    setHistoricalEra('');
    try {
      await fetchDocuments({ keyword: '', category: 'All', historicalEra: '' });
    } catch (err) {
      showAlert('error', getErrorMessage(err, 'Failed to reset filters.'));
    }
  };

  const handleOpenAccessModal = (doc) => {
    setRequestTarget(doc);
    setRequestReason('');
    setStatusMessage({ type: '', text: '' });
  };

  const handleSubmitAccessRequest = async (e) => {
    e.preventDefault();
    if (!requestTarget) return;

    setSubmittingRequest(true);
    try {
      const { data } = await api.post('/access', {
        documentId: requestTarget._id,
        reason: requestReason
      });

      setAccessRequests((prev) => [data, ...prev]);
      setDocuments((prev) =>
        prev.map((d) =>
          d._id === requestTarget._id
            ? { ...d, accessRequestStatus: 'pending' }
            : d
        )
      );
      setRequestTarget(null);
      setRequestReason('');
      showAlert(
        'success',
        `Access request submitted for "${data.document?.title}".`
      );
    } catch (err) {
      showAlert('error', getErrorMessage(err, 'Could not submit access request.'));
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCreateAnnotation = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });

    if (!noteDocId || !noteText.trim()) {
      showAlert('error', 'Select an accessible document and enter your note.');
      return;
    }

    setSubmittingNote(true);
    try {
      const { data } = await api.post(`/documents/${noteDocId}/annotations`, {
        noteText
      });
      setAnnotations((prev) => [data, ...prev]);
      setNoteText('');
      showAlert('success', 'Research annotation saved.');
    } catch (err) {
      showAlert('error', getErrorMessage(err, 'Failed to save annotation.'));
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteAnnotation = async (annotationId) => {
    setStatusMessage({ type: '', text: '' });
    try {
      await api.delete(`/documents/annotations/${annotationId}`);
      setAnnotations((prev) => prev.filter((item) => item._id !== annotationId));
      showAlert('success', 'Research annotation removed.');
    } catch (err) {
      showAlert('error', getErrorMessage(err, 'Failed to delete annotation.'));
    }
  };

  const accessibleDocs = documents.filter((d) => d.hasAccess);
  const approvedCount = accessRequests.filter(
    (r) => r.status === 'approved'
  ).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Researcher Workspace</h1>
          <p>
            Search full archival collections, request clearance for restricted
            holdings, and maintain private research annotations.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={loadAll}
          disabled={loading}
        >
          Refresh Workspace
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Catalog Records</div>
          <div className="stat-value">{documents.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Accessible Files</div>
          <div className="stat-value">{accessibleDocs.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approved Clearances</div>
          <div className="stat-value">{approvedCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Saved Research Notes</div>
          <div className="stat-value">{annotations.length}</div>
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

      <div className="tabs-bar">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          1. Document Search &amp; Retrieval
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'access' ? 'active' : ''}`}
          onClick={() => setActiveTab('access')}
        >
          2. Document Access Status ({accessRequests.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          3. Annotation &amp; Notes ({annotations.length})
        </button>
      </div>

      {activeTab === 'search' && (
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Archive Search &amp; Retrieval</h2>
              <p className="card-subtitle">
                Public or approved restricted records can be opened directly;
                unapproved restricted records require clearance.
              </p>
            </div>
          </div>

          <form className="filter-bar" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="Search title or description keywords..."
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
              placeholder="Filter by historical era..."
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
                onClick={handleResetFilters}
              >
                Reset
              </button>
            </div>
          </form>

          {loading ? (
            <p className="muted-text">Searching archive catalog...</p>
          ) : documents.length === 0 ? (
            <div className="empty-state">
              No archived documents match your current search criteria.
            </div>
          ) : (
            <div className="doc-grid">
              {documents.map((doc) => (
                <article key={doc._id} className="doc-card">
                  <div className="stack" style={{ gap: '0.55rem' }}>
                    <div className="doc-meta-row">
                      <span
                        className={`badge ${getAccessBadgeClass(
                          doc.accessLevel
                        )}`}
                      >
                        {doc.accessLevel}
                      </span>
                      <span className="badge badge-era">{doc.category}</span>
                      <span className="badge badge-neutral">
                        {doc.historicalEra}
                      </span>
                    </div>

                    <h3 className="doc-card-title">{doc.title}</h3>
                    <p className="doc-card-desc">{doc.description}</p>
                  </div>

                  <div className="stack" style={{ gap: '0.6rem' }}>
                    <div className="muted-text">
                      Format: {doc.preservationFormat} &bull;{' '}
                      {doc.preservationStatus}
                    </div>

                    <div className="btn-row">
                      {doc.hasAccess ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setViewingDoc(doc)}
                        >
                          View Document
                        </button>
                      ) : doc.accessRequestStatus === 'pending' ? (
                        <span className="badge badge-pending">
                          Access Pending Approval
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-accent btn-sm"
                          onClick={() => handleOpenAccessModal(doc)}
                        >
                          {doc.accessRequestStatus === 'rejected'
                            ? 'Re-request Access'
                            : 'Request Access'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'access' && (
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Submitted Access Requests</h2>
              <p className="card-subtitle">
                Live status of your clearance requests for restricted archival
                holdings.
              </p>
            </div>
          </div>

          {accessRequests.length === 0 ? (
            <div className="empty-state">
              You have not requested access to any restricted documents yet.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Era &amp; Category</th>
                    <th>Your Justification</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Access</th>
                  </tr>
                </thead>
                <tbody>
                  {accessRequests.map((req) => (
                    <tr key={req._id}>
                      <td>
                        <strong>{req.document?.title || 'Unavailable'}</strong>
                      </td>
                      <td>
                        <div className="muted-text">
                          {req.document?.category} &bull;{' '}
                          {req.document?.historicalEra}
                        </div>
                      </td>
                      <td style={{ maxWidth: '280px' }}>{req.reason}</td>
                      <td>
                        <span
                          className={`badge ${getRequestStatusBadgeClass(
                            req.status
                          )}`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td>{new Date(req.updatedAt).toLocaleDateString()}</td>
                      <td>
                        {req.status === 'approved' && req.document ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setViewingDoc(req.document)}
                          >
                            View Document
                          </button>
                        ) : (
                          <span className="muted-text">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'notes' && (
        <div className="split-layout">
          <section className="card">
            <div className="card-header">
              <div>
                <h2>Attach Research Note</h2>
                <p className="card-subtitle">
                  Record private analytical notes linked to any document you can
                  access.
                </p>
              </div>
            </div>

            {accessibleDocs.length === 0 ? (
              <div className="empty-state">
                No accessible documents found to annotate yet.
              </div>
            ) : (
              <form className="stack" onSubmit={handleCreateAnnotation}>
                <div className="form-group">
                  <label htmlFor="note-doc">Target Document</label>
                  <select
                    id="note-doc"
                    value={noteDocId}
                    onChange={(e) => setNoteDocId(e.target.value)}
                  >
                    {accessibleDocs.map((doc) => (
                      <option key={doc._id} value={doc._id}>
                        {doc.title} ({doc.historicalEra})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="note-text">Research Annotation</label>
                  <textarea
                    id="note-text"
                    required
                    placeholder="Document provenance observations, transcription notes, or cross-references..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingNote}
                >
                  {submittingNote ? 'Saving Note...' : 'Save Research Note'}
                </button>
              </form>
            )}
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <h2>My Saved Research Notes</h2>
                <p className="card-subtitle">
                  Personal annotations visible only to your researcher account.
                </p>
              </div>
            </div>

            {annotations.length === 0 ? (
              <div className="empty-state">
                You haven&apos;t added any research annotations yet.
              </div>
            ) : (
              <div className="stack">
                {annotations.map((note) => (
                  <div key={note._id} className="note-item">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        marginBottom: '0.35rem',
                        flexWrap: 'wrap',
                        alignItems: 'center'
                      }}
                    >
                      <strong>
                        {note.document?.title || 'Archived Document'}
                      </strong>
                      <div className="btn-row">
                        <span className="muted-text">
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteAnnotation(note._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.92rem' }}>{note.noteText}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {requestTarget && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setRequestTarget(null)}
        >
          <div
            className="modal-card"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <div>
                <h2>Request Restricted Access</h2>
                <p className="card-subtitle">{requestTarget.title}</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setRequestTarget(null)}
              >
                Cancel
              </button>
            </div>

            <form className="stack" onSubmit={handleSubmitAccessRequest}>
              <div className="form-group">
                <label htmlFor="access-reason">
                  Research Justification &amp; Intended Use
                </label>
                <textarea
                  id="access-reason"
                  required
                  placeholder="Describe your academic or historical research purpose..."
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-accent"
                disabled={submittingRequest}
              >
                {submittingRequest ? 'Submitting...' : 'Submit Access Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      <DocumentViewerModal
        document={viewingDoc}
        onClose={() => setViewingDoc(null)}
      />
    </div>
  );
};

export default ResearcherDashboard;
