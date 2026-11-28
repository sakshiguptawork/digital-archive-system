/**
 * End-to-end API smoke test against a running backend server (default http://localhost:5000).
 * Usage: node scripts/verifyApi.js
 */
const assert = require('node:assert/strict');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

const request = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

const runSmokeVerification = async () => {
  console.log(`Verifying API at ${BASE_URL}...`);

  // 1. Health check
  const health = await request('/health');
  assert.equal(health.status, 200, 'Health endpoint should return 200');
  assert.equal(health.data.status, 'ok');
  console.log('✓ Health check passed');

  const suffix = Date.now();

  // 2. Register Archivist, Researcher, Public users
  const [archivist, researcher, publicUser] = await Promise.all([
    request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Verify Archivist',
        email: `archivist.${suffix}@test.local`,
        password: 'password123',
        role: 'archivist'
      })
    }),
    request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Verify Researcher',
        email: `researcher.${suffix}@test.local`,
        password: 'password123',
        role: 'researcher'
      })
    }),
    request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Verify Public',
        email: `public.${suffix}@test.local`,
        password: 'password123',
        role: 'public'
      })
    })
  ]);

  assert.equal(archivist.status, 201);
  assert.equal(researcher.status, 201);
  assert.equal(publicUser.status, 201);
  console.log('✓ Role-based registration passed');

  // 3. RBAC check: public user cannot upload a document
  const formDenied = new FormData();
  formDenied.append('title', 'Unauthorized Upload');
  const deniedUpload = await request('/documents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${publicUser.data.token}` },
    body: formDenied
  });
  assert.equal(deniedUpload.status, 403, 'Public user must be denied upload');
  console.log('✓ RBAC upload restriction passed');

  // 4. Archivist uploads a restricted document
  const form = new FormData();
  form.append('title', `Verify Restricted Doc ${suffix}`);
  form.append('description', 'Smoke test restricted archival document');
  form.append('category', 'Manuscripts');
  form.append('historicalEra', '20th Century');
  form.append('accessLevel', 'restricted');
  form.append('preservationFormat', 'TXT/UTF-8');
  form.append('preservationStatus', 'Digitized');
  form.append(
    'file',
    new Blob(['Sample archival content'], { type: 'text/plain' }),
    'smoke-test.txt'
  );

  const uploaded = await request('/documents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${archivist.data.token}` },
    body: form
  });
  assert.equal(uploaded.status, 201);
  const docId = uploaded.data._id;
  console.log('✓ Archivist document upload passed');

  // 5. Public user cannot see restricted document in search
  const publicDocs = await request(`/documents?keyword=${suffix}`, {
    headers: { Authorization: `Bearer ${publicUser.data.token}` }
  });
  assert.equal(publicDocs.status, 200);
  assert.equal(publicDocs.data.length, 0);
  console.log('✓ Public access filtering passed');

  // 6. Researcher requests access -> Archivist approves -> Researcher annotates
  const accessReq = await request('/access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${researcher.data.token}`
    },
    body: JSON.stringify({
      documentId: docId,
      reason: 'Automated verification smoke test'
    })
  });
  assert.equal(accessReq.status, 201);

  const approved = await request(`/access/${accessReq.data._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${archivist.data.token}`
    },
    body: JSON.stringify({ status: 'approved' })
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.data.status, 'approved');

  const note = await request(`/documents/${docId}/annotations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${researcher.data.token}`
    },
    body: JSON.stringify({ noteText: 'Verified annotation note' })
  });
  assert.equal(note.status, 201);
  console.log('✓ Access request approval & researcher annotation passed');

  // 7. Archivist preservation update & cleanup delete
  const preserved = await request(`/documents/${docId}/preservation`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${archivist.data.token}`
    },
    body: JSON.stringify({
      preservationStatus: 'Verified',
      preservationFormat: 'PDF/A'
    })
  });
  assert.equal(preserved.status, 200);
  assert.equal(preserved.data.preservationStatus, 'Verified');

  const deleted = await request(`/documents/${docId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${archivist.data.token}` }
  });
  assert.equal(deleted.status, 200);
  console.log('✓ Preservation update & cleanup delete passed');

  // 8. Feedback check
  const fb = await request('/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicUser.data.token}`
    },
    body: JSON.stringify({
      message: 'Smoke test feedback',
      rating: 5
    })
  });
  assert.equal(fb.status, 201);
  console.log('✓ Public feedback submission passed');

  console.log('All API smoke checks passed!');
};

runSmokeVerification().catch((err) => {
  console.error('Smoke verification failed:', err.message);
  process.exit(1);
});
