const express = require('express');
const multer = require('multer'); // Import multer
const path = require('path');
const performancesController = require('../controllers/performancesController'); // Import your performances controller

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Save files to the 'uploads/' directory
    },
    filename: function (req, file, cb) {
        // Create a unique filename (e.g., timestamp-originalfilename.ext)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Create the multer instance with the storage configuration
const upload = multer({ storage: storage });

// Define the route for performance analysis with file upload handling
router.post('/', upload.single('audioFile'), performancesController.analyzePerformance);

// Get route to check server status
router.get('/', (req, res) => {
    res.status(200).json({ status: 'Performance analysis service is running.' });
});

module.exports = router;
