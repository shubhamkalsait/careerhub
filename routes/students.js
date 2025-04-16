const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const User = require('../models/User');
const { auth, isAdmin } = require('../middleware/auth');

// Register new student
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      education,
      skills,
    } = req.body;

    // Check if student already exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: 'Student already exists' });
    }

    // Create new student
    const student = new Student({
      email,
      password,
      originalPassword: password, // Store the original password
      firstName,
      lastName,
      phone,
      address,
      education,
      skills,
      status: 'pending',
    });

    await student.save();
    res.status(201).json({ message: 'Registration successful. Pending admin approval.' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating student', error: error.message });
  }
});

// Get all students (admin only)
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching students', error: error.message });
  }
});

// Update student status (admin only)
router.put('/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // If approving, create a user account
    if (status === 'approved') {
      // Check if user already exists
      const existingUser = await User.findOne({ email: student.email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Create new user with the original password
      const user = new User({
        email: student.email,
        password: student.originalPassword,
        firstName: student.firstName,
        lastName: student.lastName,
        role: 'student'
      });

      await user.save();
    } else if (status === 'rejected') {
      // If rejecting, delete the student record
      await Student.findByIdAndDelete(req.params.id);
      
      // Also delete the user if it exists
      await User.findOneAndDelete({ email: student.email });
    }

    // Update student status if not rejected (since we deleted the record)
    if (status !== 'rejected') {
      student.status = status;
      student.approvedBy = req.user._id;
      student.approvedAt = new Date();
      await student.save();
    }

    res.json({ message: `Student ${status} successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Error updating student status', error: error.message });
  }
});

// Delete a student
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Delete the associated user account
    await User.findOneAndDelete({ email: student.email });

    // Delete the student record
    await Student.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ message: 'Error deleting student', error: err.message });
  }
});

module.exports = router; 