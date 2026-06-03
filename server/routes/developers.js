const express = require('express');
const { listDevelopers, addDeveloper, removeDeveloper } = require('../db');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json(listDevelopers());
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const dev = addDeveloper(name.trim());
  if (!dev) return res.status(409).json({ error: 'Developer already exists' });
  res.status(201).json(dev);
});

router.delete('/:id', (req, res) => {
  const dev = removeDeveloper(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

module.exports = router;
