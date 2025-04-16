const express = require('express');
const router = express.Router();
const { auth, isAdmin, isStudent } = require('../middleware/auth');
const Job = require('../models/Job');
const Student = require('../models/Student');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get all jobs (for students)
router.get('/', auth, async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'active' })
      .populate('postedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all jobs (for admin)
router.get('/admin', auth, isAdmin, async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate('postedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new job
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const job = new Job({
      ...req.body,
      postedBy: req.user._id
    });
    const newJob = await job.save();
    res.status(201).json(newJob);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a job
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    Object.assign(job, req.body);
    const updatedJob = await job.save();
    res.json(updatedJob);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a job
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    await job.remove();
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Apply for a job
router.post('/:id/apply', auth, isStudent, upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'coverLetter', maxCount: 1 }
]), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if user has already applied
    const existingApplication = job.applications.find(
      app => app.student.toString() === req.user._id.toString()
    );
    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied for this job' });
    }

    // Validate that both files were uploaded
    if (!req.files || !req.files.resume || !req.files.coverLetter) {
      return res.status(400).json({ message: 'Both resume and cover letter are required' });
    }

    // Add the application
    job.applications.push({
      student: req.user._id,
      resume: req.files.resume[0].filename,
      coverLetter: req.files.coverLetter[0].filename,
      message: req.body.message || '',
      status: 'pending',
      appliedAt: new Date()
    });

    await job.save();
    res.json({ message: 'Application submitted successfully' });
  } catch (err) {
    console.error('Apply job error:', err);
    res.status(500).json({ message: 'Error submitting application', error: err.message });
  }
});

// Get job applications (for admin)
router.get('/:id/applications', auth, isAdmin, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('applications.student', 'firstName lastName email phone education skills');
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(job.applications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update application status
router.put('/:id/applications/:applicationId', auth, isAdmin, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const application = job.applications.id(req.params.applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    application.status = req.body.status;
    await job.save();
    res.json({ message: 'Application status updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all job applications
router.get('/applications', auth, isAdmin, async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate({
        path: 'applications.student',
        select: 'name email'
      })
      .select('title company location applications');

    // Flatten the applications array
    const applications = jobs.reduce((acc, job) => {
      const jobApplications = job.applications.map(app => ({
        _id: app._id,
        job: {
          title: job.title,
          company: job.company,
          location: job.location
        },
        student: app.student,
        resume: app.resume,
        coverLetter: app.coverLetter,
        status: app.status,
        appliedAt: app.appliedAt
      }));
      return [...acc, ...jobApplications];
    }, []);

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching applications' });
  }
});

// Download application file
router.get('/download/:filename', auth, isAdmin, (req, res) => {
  const file = path.join(__dirname, '../uploads', req.params.filename);
  res.download(file, (err) => {
    if (err) {
      console.error('Download error:', err);
      res.status(500).json({ message: 'Error downloading file' });
    }
  });
});

module.exports = router; 