import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Save profile photo (base64)
router.post('/photo', authenticateToken, async (req, res) => {
  try {
    const { photo } = req.body; // base64 string
    
    console.log('[Profile Photo] POST request received');
    console.log('[Profile Photo] User ID:', req.user.id || req.user._id);

    if (!photo) {
      return res.status(400).json({ success: false, message: 'Photo is required' });
    }

    // Validate it's a base64 image
    if (!photo.startsWith('data:image/')) {
      return res.status(400).json({ success: false, message: 'Invalid image format' });
    }

    // Get user ID - handle both _id and id
    const userId = req.user._id || req.user.id;
    console.log('[Profile Photo] Attempting to save for user:', userId);

    // For Google users, the ID is not a valid ObjectId
    // We'll use findOne with a custom ID or create if doesn't exist
    let user;
    try {
      user = await User.findByIdAndUpdate(
        userId,
        { 
          profilePhoto: photo,
          faceRegistered: true
        },
        { new: true, upsert: false }
      );
    } catch (err) {
      console.log('[Profile Photo] ObjectId error, creating new user document');
      // If ObjectId error, create a new user document with the Google ID
      user = await User.create({
        _id: userId,
        name: 'User',
        email: 'user@example.com',
        profilePhoto: photo,
        faceRegistered: true,
        isActive: true
      });
    }

    console.log('[Profile Photo] Save successful:', user ? 'User updated/created' : 'Failed');

    res.json({
      success: true,
      message: 'Profile photo saved successfully',
      faceRegistered: user ? user.faceRegistered : true
    });
  } catch (error) {
    console.error('[Profile Photo] Error:', error.message);
    console.error('[Profile Photo] Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save profile photo',
      error: error.message 
    });
  }
});

// Get profile photo for face verification
router.get('/photo', authenticateToken, async (req, res) => {
  try {
    // Get user ID - handle both _id and id
    const userId = req.user._id || req.user.id;
    
    console.log('[Profile Photo] GET request for user:', userId);
    
    // For Google users, the ID is not a valid ObjectId, so handle it differently
    let user;
    try {
      user = await User.findById(userId).select('profilePhoto faceRegistered');
    } catch (err) {
      // If findById fails (invalid ObjectId), return 404
      console.log('[Profile Photo] Invalid ObjectId, no photo found');
      return res.status(404).json({ success: false, message: 'No profile photo found' });
    }

    if (!user || !user.profilePhoto) {
      console.log('[Profile Photo] No photo found for user');
      return res.status(404).json({ success: false, message: 'No profile photo found' });
    }

    console.log('[Profile Photo] Photo found and returned');
    res.json({
      success: true,
      photo: user.profilePhoto,
      faceRegistered: user.faceRegistered || false
    });
  } catch (error) {
    console.error('[Profile Photo] GET error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get profile photo', error: error.message });
  }
});

export default router;
