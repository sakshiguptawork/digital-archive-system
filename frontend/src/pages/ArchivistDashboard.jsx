import { useEffect, useState } from 'react';
import DocumentViewerModal from '../components/DocumentViewerModal';
import {
  CATEGORIES,
  PRESERVATION_FORMATS,
  PRESERVATION_STATUSES
} from '../constants/archiveOptions';
import api, { getErrorMessage } from '../services/api';
import {
  exportInventoryToCsv,
  getAccessBadgeClass,
  getPreservationBadgeClass,
  getRequestStatusBadgeClass
} from '../utils/documentHelpers';

const ArchivistDashboard = () => {
  const [activeTab, setActiveTab] = useState('archive');
  const [documents, setDocuments] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [viewingDoc, setViewingDoc] = useState(null);

  // Inventory search & status filter
  const [inventoryQuery, setInventoryQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Upload form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0],
    historicalEra: '',
    accessLevel: 'public',
    preservationFormat: PRESERVATION_FORMATS[0],
    preservationStatus: PRESERVATION_STATUSES[0]
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  // Preservation inline format edits keyed by docId
  const [formatEdits, setFormatEdits] = useState({});

  const showAlert = (type, text) => {
    setStatusMessage({ type, text });
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [docsRes, accessRes] = await Promise.all([
        api.get('/documents'),
        api.get('/access')
      ]);
      setDocuments(docsRes.data);
      setAccessRequests(accessRes.data);

      const initialFormats = {};
      docsRes.data.forEach((doc) => {
        initialFormats[doc._id] = doc.preservationFormat;
      });
      setFormatEdits(initialFormats);
    } catch (err) {
      showAlert('error', getErrorMessage(err, 'Failed to load archivist data.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });

    if (!selectedFile) {
      showAlert('error', 'Please select a document file to upload.');
      return;
    }

    const payload = new FormData();
    Object.entries(form).forEach(([key, val]) => payload.append(key, val));
    payload.append('file', selectedFile);

    setSubmitting(true);
    try {
      const { data } = await api.post('/documents', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setDocuments((prev) => [data, ...prev]);
      setFormatEdits((prev) => ({
        ...prev,
        [data._id]: data.preservationFormat
      }));

      setForm({
        title: '',
        description: '',
        category: CATEGORIES[0],
        historicalEra: '',
        accessLevel: 'public',
        preservationFormat: PRESERVATION_FORMATS[0],
        preservationStatus: PRESERVATION_STATUSES[0]
      });
      setSelectedFile(null);
      setFileInputKey(Date.now());
      showAlert('success', `Archived "${data.title}" successfully.`);
    } catch (err) {
      showAlert('error', getErrorMessage(err, 'Failed to archive document.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewRequest = async (requestId, status) => {
    setStatusMessage({ type: '', text: '' });
    try {
      const { data } = await api.put(`/access/${requestId}`, { status });
      setAccessRequests((prev) =>
        prev.map((req) => (req._id === requestId ? data : req))
      );
      showAlert(
        'success',
        `Access request ${status === 'approved' ? 'approved' : 'rejected'}.`
      );
    } catch (err) {
      showAlert('error', getErrorMessage(err, 'Failed to update access request.'));
    }
  };

  const handleUpdatePreservation = async (docId, newStatus) => {
    setStatusMessage({ type: '', text: '' });
    try {
      const { data } = await api.put(`/documents/${docId}/preservation`, {
        preservationStatus: newStatus,
        preservationFormat: formatEdits[docId]
      });
      setDocuments((prev) =>
        prev.map((doc) => (doc._id === docId ? data : doc))
      );
      showAlert(
        'success',
        `Updated preservation for "${data.title}" to ${data.preservationStatus} (${data.preservationFormat}).`
      );
    } catch (err) {
      showAlert(
        'error',
        getErrorMessage(err, 'Failed to update preservation details.')
      );
    }
  };

  const handleDeleteDocument = async (doc) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${doc.title}"?`
    );
    if (!confirmed) return;

    setStatusMessage({ type: '', text: '' });
    try {
      await api.delete(`/documents/${doc._id}`);
      setDocuments((prev) => prev.filter((item) => item._id !== doc._id));
      setAccessRequests((prev) =>
        prev.filter((req) => req.document?._id !== doc._id)
      );
      showAlert('success', `Deleted "${doc.title}" from the archive.`);
    } catch (err) {
      showAlert('error', getErrorMessage(err, 'Failed to delete document.'));
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesStatus =
      statusFilter === 'All' || doc.preservationStatus === statusFilter;
    const query = inventoryQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      doc.title.toLowerCase().includes(query) ||
      doc.category.toLowerCase().includes(query) ||
      doc.historicalEra.toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });

  const pendingRequestsCount = accessRequests.filter(
    (r) => r.status === 'pending'
  ).length;
  const verifiedCount = documents.filter(
    (d) => d.preservationStatus === 'Verified'
  ).length;
  const restrictedCount = documents.filter(
    (d) => d.accessLevel === 'restricted'
  ).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Archivist Control Center</h1>
          <p>
            Ingest historical records, govern researcher access, and verify
            digital preservation integrity.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={fetchDashboardData}
          disabled={loading}
        >
          Refresh Data
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Archived Records</div>
          <div className="stat-value">{documents.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Restricted Collections</div>
          <div className="stat-value">{restrictedCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Verified Preservation</div>
          <div className="stat-value">{verifiedCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Access Requests</div>
          <div className="stat-value">{pendingRequestsCount}</div>
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
          className={`tab-btn ${activeTab === 'archive' ? 'active' : ''}`}
          onClick={() => setActiveTab('archive')}
        >
          1. Archive Management
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'access' ? 'active' : ''}`}
          onClick={() => setActiveTab('access')}
        >
          2. User Access Management ({pendingRequestsCount} Pending)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'preservation' ? 'active' : ''}`}
          onClick={() => setActiveTab('preservation')}
        >
          3. Document Preservation ({documents.length})
        </button>
      </div>

      {activeTab === 'archive' && (
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Archive New Historical Document</h2>
              <p className="card-subtitle">
                Upload a digitized record along with archival metadata and
                access classification.
              </p>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleUploadSubmit}>
            <div className="form-group">
              <label htmlFor="doc-title">Document Title</label>
              <input
                id="doc-title"
                name="title"
                type="text"
                required
                placeholder="e.g., 1924 Municipal Charter Ledger"
                value={form.title}
                onChange={handleFormChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="doc-era">Historical Era</label>
              <input
                id="doc-era"
                name="historicalEra"
                type="text"
                required
                placeholder="e.g., Early 20th Century (1900–1945)"
                value={form.historicalEra}
                onChange={handleFormChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="doc-category">Category</label>
              <select
                id="doc-category"
                name="category"
                value={form.category}
                onChange={handleFormChange}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="doc-access">Access Level</label>
              <select
                id="doc-access"
                name="accessLevel"
                value={form.accessLevel}
                onChange={handleFormChange}
              >
                <option value="public">Public (Open to All Users)</option>
                <option value="restricted">
                  Restricted (Requires Archivist Approval)
                </option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="doc-format">Preservation Format</label>
              <select
                id="doc-format"
                name="preservationFormat"
                value={form.preservationFormat}
                onChange={handleFormChange}
              >
                {PRESERVATION_FORMATS.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {fmt}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="doc-status">Initial Preservation Status</label>
              <select
                id="doc-status"
                name="preservationStatus"
                value={form.preservationStatus}
                onChange={handleFormChange}
              >
                {PRESERVATION_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label htmlFor="doc-description">Archival Description</label>
              <textarea
                id="doc-description"
                name="description"
                required
                placeholder="Summarize provenance, physical condition, and historical significance..."
                value={form.description}
                onChange={handleFormChange}
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="doc-file">
                Document File (PDF, Image, Text, Audio/Video, Word — max 25 MB)
              </label>
              <input
                key={fileInputKey}
                id="doc-file"
                type="file"
                required
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="full-width">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Archiving Document...' : 'Upload & Archive Document'}
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'access' && (
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Researcher Access Requests</h2>
              <p className="card-subtitle">
                Review justification statements and grant or deny access to
                restricted records.
              </p>
            </div>
          </div>

          {loading ? (
            <p className="muted-text">Loading access requests...</p>
          ) : accessRequests.length === 0 ? (
            <div className="empty-state">
              No researcher access requests have been submitted yet.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Researcher</th>
                    <th>Document</th>
                    <th>Justification</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accessRequests.map((req) => (
                    <tr key={req._id}>
                      <td>
                        <strong>{req.researcher?.name || 'Unknown'}</strong>
                        <div className="muted-text">
                          {req.researcher?.email}
                        </div>
                      </td>
                      <td>
                        <strong>
                          {req.document?.title || 'Deleted Document'}
                        </strong>
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
                      <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="btn-row">
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            disabled={req.status === 'approved'}
                            onClick={() =>
                              handleReviewRequest(req._id, 'approved')
                            }
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={req.status === 'rejected'}
                            onClick={() =>
                              handleReviewRequest(req._id, 'rejected')
                            }
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'preservation' && (
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Document Preservation Inventory</h2>
              <p className="card-subtitle">
                Filter records, update preservation formats, verify archival
                integrity, or export inventory as CSV.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={filteredDocuments.length === 0}
              onClick={() => exportInventoryToCsv(filteredDocuments)}
            >
              Export CSV
            </button>
          </div>

          <div
            className="filter-bar"
            style={{ gridTemplateColumns: '2fr 1fr auto' }}
          >
            <input
              type="text"
              placeholder="Filter inventory by title, category, or era..."
              value={inventoryQuery}
              onChange={(e) => setInventoryQuery(e.target.value)}
            />
            <select
              aria-label="Filter by preservation status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              {PRESERVATION_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setInventoryQuery('');
                setStatusFilter('All');
              }}
            >
              Reset
            </button>
          </div>

          {loading ? (
            <p className="muted-text">Loading inventory...</p>
          ) : filteredDocuments.length === 0 ? (
            <div className="empty-state">
              No archived documents match the current inventory filter.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Access</th>
                    <th>Preservation Format</th>
                    <th>Status</th>
                    <th>Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr key={doc._id}>
                      <td>
                        <strong>{doc.title}</strong>
                        <div className="muted-text">
                          {doc.category} &bull; {doc.historicalEra}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${getAccessBadgeClass(
                            doc.accessLevel
                          )}`}
                        >
                          {doc.accessLevel}
                        </span>
                      </td>
                      <td>
                        <select
                          aria-label={`Preservation format for ${doc.title}`}
                          value={formatEdits[doc._id] || doc.preservationFormat}
                          onChange={(e) =>
                            setFormatEdits((prev) => ({
                              ...prev,
                              [doc._id]: e.target.value
                            }))
                          }
                        >
                          {PRESERVATION_FORMATS.map((fmt) => (
                            <option key={fmt} value={fmt}>
                              {fmt}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span
                          className={`badge ${getPreservationBadgeClass(
                            doc.preservationStatus
                          )}`}
                        >
                          {doc.preservationStatus}
                        </span>
                      </td>
                      <td>
                        <div className="btn-row">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setViewingDoc(doc)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() =>
                              handleUpdatePreservation(doc._id, 'Verified')
                            }
                          >
                            Verify
                          </button>
                          <button
                            type="button"
                            className="btn btn-accent btn-sm"
                            onClick={() =>
                              handleUpdatePreservation(
                                doc._id,
                                'Needs Migration'
                              )
                            }
                          >
                            Flag Migration
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteDocument(doc)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <DocumentViewerModal
        document={viewingDoc}
        onClose={() => setViewingDoc(null)}
      />
    </div>
  );
};

export default ArchivistDashboard;
