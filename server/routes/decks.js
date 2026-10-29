const express = require('express');
const { listAds, listApps, listDecks, getDeck, insertDeck, deleteDeck } = require('../db');

const router = express.Router();

router.get('/', (_req, res) => res.json(listDecks()));

router.post('/', (req, res) => {
  const name = String(req.body.name || '').trim();
  const adIds = Array.isArray(req.body.adIds) ? [...new Set(req.body.adIds.filter(id => typeof id === 'string'))] : [];
  if (!name) return res.status(400).json({ error: 'Deck name is required.' });
  if (!adIds.length) return res.status(400).json({ error: 'Choose at least one playable.' });
  const knownIds = new Set(listAds().map(ad => ad.id));
  if (adIds.some(id => !knownIds.has(id))) return res.status(400).json({ error: 'One or more selected playables no longer exist.' });
  res.status(201).json(insertDeck({ name, adIds }));
});

router.delete('/:id', (req, res) => {
  if (!deleteDeck(req.params.id)) return res.status(404).json({ error: 'Deck not found.' });
  res.status(204).end();
});

function publicRouter() {
  const publicRoutes = express.Router();
  publicRoutes.get('/:id', (req, res) => {
    const deck = getDeck(req.params.id);
    if (!deck) return res.status(404).json({ error: 'Deck not found.' });
    const adsById = new Map(listAds().map(ad => [ad.id, ad]));
    const appsById = new Map(listApps().map(app => [app.id, app]));
    const ads = deck.adIds.map(id => adsById.get(id)).filter(Boolean).map(ad => ({ ...ad, app: appsById.get(ad.appId) || null }));
    res.json({ id: deck.id, name: deck.name, ads });
  });
  return publicRoutes;
}

module.exports = { router, publicRouter: publicRouter() };
