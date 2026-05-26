const express = require('express');
const crypto = require('crypto');

const router = express.Router();

function makeToken(password) {
  return crypto.createHmac('sha256', password).update('showcase-session').digest('hex');
}

router.post('/login', (req, res) => {
  const { password } = req.body;
  const expected = (process.env.SHOWCASE_PASSWORD || '').trim();

  if (!expected) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  if (!password || password !== expected) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  res.json({ token: makeToken(expected) });
});

module.exports = { router, makeToken };
