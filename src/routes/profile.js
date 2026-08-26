const express = require('express');
const profileService = require('../services/profileService');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(profileService.getProfile());
});

router.put('/', (req, res) => {
  try {
    const updated = profileService.updateProfile(req.body || {});
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/reset', (req, res) => {
  res.json(profileService.resetProfile());
});

module.exports = router;
