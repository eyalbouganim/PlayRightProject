const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const A2SAController = require('../controllers/A2SAController');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'uploads/audio';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer (Same logic as your performances.js)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/audio/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'a2sa-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Define the endpoint
// Matches: POST /api/a2sa/align
router.post('/align', upload.fields([{ name: 'audio', maxCount: 1 }]), A2SAController.align);

module.exports = router;