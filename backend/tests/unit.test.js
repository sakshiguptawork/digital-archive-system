const test = require('node:test');
const assert = require('node:assert/strict');
const { authorizeRoles, protect } = require('../middleware/authMiddleware');
const { errorHandler } = require('../middleware/errorMiddleware');
const { escapeRegex } = require('../controllers/documentController');

const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
};

test('escapeRegex escapes special regular expression characters safely', () => {
  const raw = 'C++ (1947) [draft]?*';
  const escaped = escapeRegex(raw);
  const regex = new RegExp(escaped, 'i');
  assert.equal(regex.test('C++ (1947) [draft]?* archive'), true);
  assert.equal(regex.test('unrelated'), false);
});

test('authorizeRoles allows permitted role and blocks unauthorized role with 403', () => {
  const middleware = authorizeRoles('archivist');

  // Permitted role
  let nextCalled = false;
  const resOk = createMockRes();
  middleware({ user: { role: 'archivist' } }, resOk, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);

  // Forbidden role
  let forbiddenNextCalled = false;
  const resForbidden = createMockRes();
  middleware({ user: { role: 'public' } }, resForbidden, () => {
    forbiddenNextCalled = true;
  });
  assert.equal(forbiddenNextCalled, false);
  assert.equal(resForbidden.statusCode, 403);
  assert.match(resForbidden.body.message, /Forbidden/);
});

test('protect rejects requests missing Bearer token with 401', async () => {
  const req = { headers: {} };
  const res = createMockRes();
  let nextCalled = false;

  await protect(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /missing/i);
});

test('errorHandler maps CastError and duplicate key 11000 to clean status codes', () => {
  const castRes = createMockRes();
  errorHandler({ name: 'CastError', path: 'id' }, {}, castRes, () => {});
  assert.equal(castRes.statusCode, 400);
  assert.match(castRes.body.message, /Invalid identifier/);

  const dupRes = createMockRes();
  errorHandler({ code: 11000, keyValue: { email: 'a@b.com' } }, {}, dupRes, () => {});
  assert.equal(dupRes.statusCode, 409);
  assert.match(dupRes.body.message, /already exists/);
});
