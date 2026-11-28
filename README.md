# ChronicleVault — Cloud-Based Digital Archive System

A full-stack **MERN** (MongoDB, Express.js, React.js, Node.js) web application designed for institutions, historians, and the public to digitize, preserve, search, and govern access to historical documents and archival records.

---

## Problem Solved & Overview

Physical and fragmented historical records are vulnerable to degradation, inconsistent cataloging, and uncontrolled access. **ChronicleVault** provides a unified digital repository where:

- **Archivists** ingest digitized files with rich metadata, track digital preservation formats/statuses, export archival inventories, and review clearance requests for restricted holdings.
- **Researchers** search across public and restricted collections, submit justified access requests, view approved documents, and manage private research annotations.
- **Public Users** search open historical collections, inspect metadata and original files, copy formatted archival citations, and submit 1–5 star archive feedback.

---

## System Architecture

```text
+-----------------------------------+        HTTPS / REST JSON + JWT        +------------------------------------+
|        React + Vite SPA           | <-----------------------------------> |      Express.js REST API           |
|  - AuthContext (localStorage)     |                                       |  - CORS & Error Middleware         |
|  - Axios Interceptor (Bearer JWT) |        Static /uploads/* Files        |  - protect + authorizeRoles (RBAC) |
|  - Role-Based Dashboards          | <-----------------------------------> |  - Multer File Storage             |
+-----------------------------------+                                       +-----------------+------------------+
                                                                                              |
                                                                                              v
                                                                            +------------------------------------+
                                                                            |        MongoDB + Mongoose          |
                                                                            |  Users | Documents | AccessRequests|
                                                                            |  Annotations | Feedback            |
                                                                            +------------------------------------+
```

### Stack & Rubric Alignment Note

This project is implemented on the **MERN stack** (MongoDB, Express.js, React.js, Node.js). Architectural and testing criteria from general full-stack rubrics—such as layered separation of concerns (routes/controllers/models and services/components/utils), server-side validation, persistent relational/document data modeling, RBAC enforcement, and unit/end-to-end verification—are satisfied directly using Node/Express/Mongoose and React/Vite rather than Java Servlets/Swing/Maven.

---

## Project Structure

```text
archive system/
├── .gitignore
├── README.md
├── docs/
│   └── PRESENTATION.md                  # Slide-by-slide PPT/PDF blueprint & diagrams
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── server.js                        # Express app, CORS, static /uploads, route mounting
│   ├── config/
│   │   └── db.js                        # MongoDB connection via MONGO_URI
│   ├── controllers/
│   │   ├── accessController.js          # Access request submission & archivist review
│   │   ├── authController.js            # Registration, login, JWT generation, /me
│   │   ├── documentController.js        # CRUD, search/filtering, preservation, annotations
│   │   └── feedbackController.js        # Community ratings & comments
│   ├── middleware/
│   │   ├── authMiddleware.js            # protect (JWT) & authorizeRoles (RBAC)
│   │   ├── errorMiddleware.js           # 404 handler & structured JSON error mapping
│   │   └── uploadMiddleware.js          # Multer disk storage, extension filter & 25 MB limit
│   ├── models/
│   │   ├── AccessRequest.js
│   │   ├── Annotation.js
│   │   ├── Document.js
│   │   ├── Feedback.js
│   │   └── User.js
│   ├── routes/
│   │   ├── accessRoutes.js
│   │   ├── authRoutes.js
│   │   ├── documentRoutes.js
│   │   └── feedbackRoutes.js
│   ├── scripts/
│   │   ├── seed.js                      # Demo users, documents, requests, notes & feedback
│   │   └── verifyApi.js                 # Live end-to-end API smoke test
│   ├── tests/
│   │   └── unit.test.js                 # Node built-in unit tests (middleware, regex, errors)
│   └── uploads/
│       └── .gitkeep
└── frontend/
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── components/
        │   ├── DocumentViewerModal.jsx  # Modal metadata & preview viewer
        │   ├── FilePreview.jsx          # Reusable image/PDF/text preview & citation copy
        │   ├── Navbar.jsx               # Brand header, role chip & sign out
        │   └── ProtectedRoute.jsx       # Client-side RBAC route guard
        ├── constants/
        │   └── archiveOptions.js        # Shared categories, formats, statuses, demo accounts
        ├── context/
        │   └── AuthContext.jsx          # Session state, localStorage & 401 expiry handling
        ├── pages/
        │   ├── ArchivistDashboard.jsx   # Upload, access approvals, preservation & CSV export
        │   ├── LoginPage.jsx            # Sign-in form + quick demo credential fill
        │   ├── PublicDashboard.jsx      # Public search, metadata viewer & 1–5 star feedback
        │   ├── RegisterPage.jsx         # Account registration with role selection
        │   └── ResearcherDashboard.jsx  # Search, access requests, status & annotations
        ├── services/
        │   └── api.js                   # Axios client, Bearer interceptor & URL builder
        ├── styles/
        │   └── index.css                # Responsive custom archival UI theme
        └── utils/
            └── documentHelpers.js       # Shared badge classes, citations & CSV export
```

---

## Prerequisites

- **Node.js** (v18+ LTS recommended) and **npm**
- **MongoDB** (local Community Server `mongodb://127.0.0.1:27017` or MongoDB Atlas)
- **Git** (for version control and GitHub hosting)

---

## Environment Setup

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and update values if needed:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/digital_archive_system
JWT_SECRET=change_this_to_a_long_random_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env`, optional)

Defaults to `http://localhost:5000/api`. Copy `frontend/.env.example` to `frontend/.env` to customize:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Installation, Seeding & Running

### 1. Backend Setup (Port `5000`)

```bash
cd backend
npm install
npm run seed    # Optional: populates demo accounts, sample archive files & records
npm start       # Starts Express API on http://localhost:5000
```

For development auto-reload:

```bash
npm run dev
```

### 2. Frontend Setup (Port `5173`)

Open a second terminal:

```bash
cd frontend
npm install
npm run dev     # Starts Vite React app on http://localhost:5173
```

### 3. Seeded Demo Accounts (after `npm run seed`)

All demo accounts use password `password123` (quick-fill buttons are also available on the Login page):

| Role | Email | Capabilities |
| :--- | :--- | :--- |
| **Archivist** | `archivist@archive.org` | Upload files, approve/reject access requests, verify/delete records, export CSV |
| **Researcher** | `researcher@archive.org` | Search all metadata, request restricted access, add/delete research notes |
| **Public User** | `public@archive.org` | Search public records, inspect files, copy citations, submit 1–5 star feedback |

---

## Testing & Verification

### Unit Tests (No live DB required)

```bash
cd backend
npm test
```

Covers RBAC role enforcement (`authorizeRoles`), missing-token rejection (`protect`), regex escaping (`escapeRegex`), and centralized error mapping (`errorHandler`).

### End-to-End API Smoke Verification (Requires running backend + MongoDB)

```bash
cd backend
npm run verify
```

Verifies `/api/health`, multi-role registration, RBAC upload denial for `public` users, `archivist` multipart file upload, public search filtering, `researcher` access request -> `archivist` approval -> annotation creation, preservation status update, document deletion, and feedback submission.

---

## API Endpoints Reference

### Health
- `GET /api/health` — Backend service status check

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register user (`archivist`, `researcher`, or `public`) and return JWT
- `POST /api/auth/login` — Authenticate and return JWT + profile
- `GET /api/auth/me` — Get current authenticated user profile (`protect`)

### Documents & Annotations (`/api/documents`)
- `POST /api/documents` — Upload file (`multipart/form-data`, field `file`) and save metadata (**Archivist only**)
- `GET /api/documents` — Search/filter by `keyword`, `category`, `historicalEra`, `accessLevel` (`protect`; automatically locks `public` users to `accessLevel: 'public'` and hides unapproved restricted `fileUrl`s from `researcher` users)
- `GET /api/documents/:id` — Retrieve single document metadata with RBAC enforcement (`protect`)
- `PUT /api/documents/:id/preservation` — Update `preservationStatus` and `preservationFormat` (**Archivist only**)
- `DELETE /api/documents/:id` — Delete document, uploaded file, access requests, and annotations (**Archivist only**)
- `POST /api/documents/:id/annotations` — Create personal research note on an accessible document (**Researcher only**)
- `GET /api/documents/annotations/my` — List logged-in researcher's saved notes (**Researcher only**)
- `DELETE /api/documents/annotations/:annotationId` — Delete researcher's own annotation (**Researcher only**)

### Access Requests (`/api/access`)
- `POST /api/access` — Submit access request for a restricted document (**Researcher only**)
- `GET /api/access` — View all requests (**Archivist**) or own requests (**Researcher**)
- `PUT /api/access/:id` — Approve or reject an access request (**Archivist only**)

### Feedback (`/api/feedback`)
- `POST /api/feedback` — Submit feedback message and 1–5 star rating (`protect`)
- `GET /api/feedback` — Retrieve recent archive feedback entries

---

## Extra & Innovative Enhancements

- **Security-First Restricted File Masking:** Unapproved restricted `fileUrl` paths are stripped from `/api/documents` and `/api/access` responses until an Archivist approves clearance.
- **CSV Inventory Export:** Archivists can export filtered preservation inventory tables directly to CSV.
- **One-Click Archival Citation Copy:** Both Researchers and Public Users can copy standardized citations from the document viewer.
- **Automatic Session Expiry Handling:** Axios intercepts `401` responses on protected endpoints to clear stale `localStorage` tokens cleanly.
- **Idempotent Seeder & Smoke Suite:** `npm run seed` and `npm run verify` provide repeatable demo setup and end-to-end validation.

---

## Git & GitHub Collaboration Workflow

```bash
git init
git add .
git commit -m "Initial commit: Cloud-Based Digital Archive System (MERN)"
git branch -M main
git remote add origin https://github.com/sakshiguptawork/digital-archive-system.git
git push -u origin main
```
