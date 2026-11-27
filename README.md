# digital-archive-system

cloud-digital-archive/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── uploadMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Document.js
│   │   ├── AccessRequest.js
│   │   ├── Annotation.js
│   │   └── Feedback.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── documentRoutes.js
│   │   ├── accessRoutes.js
│   │   ├── annotationRoutes.js
│   │   └── feedbackRoutes.js
│   ├── uploads/               <-- Create an empty folder with a .gitkeep file
│   ├── .env
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ArchivistDashboard.jsx
│   │   │   ├── ResearcherDashboard.jsx
│   │   │   └── PublicDashboard.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
