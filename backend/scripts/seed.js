const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Document = require('../models/Document');
const AccessRequest = require('../models/AccessRequest');
const Annotation = require('../models/Annotation');
const Feedback = require('../models/Feedback');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const uploadsDir = path.join(__dirname, '..', 'uploads');

const sampleFiles = [
  {
    filename: 'seed-charter-1924.txt',
    content:
      'MUNICIPAL CHARTER TRANSCRIPT (1924)\n' +
      'Section I: Preservation of Public Civic Ledgers & Land Surveys.\n' +
      'Verified by the Office of Civic Records.\n'
  },
  {
    filename: 'seed-maritime-log-1889.txt',
    content:
      'HARBORMASTER MARITIME LOGBOOK (1889)\n' +
      'Entry 42: Steamship Meridian arrived 06:15 GMT carrying coastal survey charts.\n'
  },
  {
    filename: 'seed-observatory-dispatch-1957.txt',
    content:
      'RESTRICTED OBSERVATORY DISPATCH (1957)\n' +
      'Orbital telemetry calibration notes and atmospheric radio measurements.\n'
  },
  {
    filename: 'seed-correspondence-1912.txt',
    content:
      'PRIVATE EXPEDITION CORRESPONDENCE (1912)\n' +
      'Field letters detailing botanical specimens collected in the northern ridge.\n'
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    for (const file of sampleFiles) {
      fs.writeFileSync(path.join(uploadsDir, file.filename), file.content, 'utf8');
    }

    // Clear existing demo data for idempotent seeding
    await Promise.all([
      Annotation.deleteMany({}),
      AccessRequest.deleteMany({}),
      Feedback.deleteMany({}),
      Document.deleteMany({}),
      User.deleteMany({
        email: {
          $in: [
            'archivist@archive.org',
            'researcher@archive.org',
            'public@archive.org'
          ]
        }
      })
    ]);

    const [archivist, researcher, publicUser] = await User.create([
      {
        name: 'Clara Mercer',
        email: 'archivist@archive.org',
        password: 'password123',
        role: 'archivist'
      },
      {
        name: 'Dr. Julian Reid',
        email: 'researcher@archive.org',
        password: 'password123',
        role: 'researcher'
      },
      {
        name: 'Alex Rivera',
        email: 'public@archive.org',
        password: 'password123',
        role: 'public'
      }
    ]);

    const docs = await Document.create([
      {
        title: '1924 Municipal Charter & Civic Ledger',
        description:
          'Founding municipal charter detailing early civic governance, public works allotments, and town boundary surveys.',
        category: 'Government Records',
        historicalEra: 'Early 20th Century (1900–1945)',
        accessLevel: 'public',
        preservationFormat: 'TXT/UTF-8',
        preservationStatus: 'Verified',
        fileUrl: '/uploads/seed-charter-1924.txt',
        originalFileName: 'seed-charter-1924.txt',
        mimeType: 'text/plain',
        uploadedBy: archivist._id
      },
      {
        title: '1889 Harbormaster Maritime Logbook',
        description:
          'Daily port arrival register recording merchant vessels, tonnage manifests, and coastal weather observations.',
        category: 'Manuscripts',
        historicalEra: 'Victorian Era (1837–1901)',
        accessLevel: 'public',
        preservationFormat: 'TXT/UTF-8',
        preservationStatus: 'Digitized',
        fileUrl: '/uploads/seed-maritime-log-1889.txt',
        originalFileName: 'seed-maritime-log-1889.txt',
        mimeType: 'text/plain',
        uploadedBy: archivist._id
      },
      {
        title: '1957 Observatory Telemetry Dispatch',
        description:
          'Restricted technical correspondence covering early satellite tracking calibration and ionospheric measurements.',
        category: 'Correspondence',
        historicalEra: 'Cold War Era (1947–1991)',
        accessLevel: 'restricted',
        preservationFormat: 'PDF/A',
        preservationStatus: 'Verified',
        fileUrl: '/uploads/seed-observatory-dispatch-1957.txt',
        originalFileName: 'seed-observatory-dispatch-1957.txt',
        mimeType: 'text/plain',
        uploadedBy: archivist._id
      },
      {
        title: '1912 Northern Ridge Field Correspondence',
        description:
          'Fragile private botanical expedition letters requiring conservation review and controlled researcher access.',
        category: 'Correspondence',
        historicalEra: 'Early 20th Century (1900–1945)',
        accessLevel: 'restricted',
        preservationFormat: 'TIFF',
        preservationStatus: 'Needs Migration',
        fileUrl: '/uploads/seed-correspondence-1912.txt',
        originalFileName: 'seed-correspondence-1912.txt',
        mimeType: 'text/plain',
        uploadedBy: archivist._id
      }
    ]);

    await AccessRequest.create([
      {
        researcher: researcher._id,
        document: docs[2]._id,
        reason: 'Cross-referencing 1957 radio telemetry logs for university history of science thesis.',
        status: 'approved',
        reviewedBy: archivist._id
      },
      {
        researcher: researcher._id,
        document: docs[3]._id,
        reason: 'Transcribing early 20th-century botanical taxonomy references.',
        status: 'pending'
      }
    ]);

    await Annotation.create([
      {
        researcher: researcher._id,
        document: docs[0]._id,
        noteText: 'Section I confirms the 1924 civic boundary expansion predates the railway annex.'
      },
      {
        researcher: researcher._id,
        document: docs[2]._id,
        noteText: 'Telemetry calibration intervals align with the October 1957 northern station bulletin.'
      }
    ]);

    await Feedback.create([
      {
        user: publicUser._id,
        userName: publicUser.name,
        message: 'Clear metadata organization and fast public record search by era.',
        rating: 5
      },
      {
        user: researcher._id,
        userName: researcher.name,
        message: 'Requesting restricted telemetry dispatches and attaching notes works smoothly.',
        rating: 5
      }
    ]);

    console.log('Seed completed successfully!');
    console.log('Demo accounts (password: password123):');
    console.log('  Archivist  : archivist@archive.org');
    console.log('  Researcher : researcher@archive.org');
    console.log('  Public User: public@archive.org');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
};

seedDatabase();
