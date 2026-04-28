const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticate } = require('../middleware/auth');

// GET /api/levels - Get all levels with user progress
router.get('/', authenticate, (req, res) => {
  try {
    const levels = db.prepare('SELECT * FROM levels ORDER BY level_number').all();
    const userLevels = db.prepare('SELECT * FROM user_levels WHERE user_id = ?').all(req.user.id);
    const ulMap = {};
    userLevels.forEach(ul => { ulMap[ul.level_id] = ul; });

    const result = levels.map(l => ({
      ...l,
      user_progress: ulMap[l.id] || null,
      word_count: db.prepare('SELECT COUNT(*) as cnt FROM words WHERE level_id = ?').get(l.id).cnt
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/levels/:id/words - Get words for a level
router.get('/:id/words', authenticate, (req, res) => {
  try {
    const level = db.prepare('SELECT * FROM levels WHERE id = ?').get(req.params.id);
    if (!level) return res.status(404).json({ error: 'Level not found' });

    // Check if user has access (level 1 always open, others require previous completion)
    if (level.is_locked && !req.user.is_admin) {
      // Check if user has completed previous level
      const prevLevel = db.prepare('SELECT id FROM levels WHERE level_number = ?').get(level.level_number - 1);
      if (prevLevel) {
        const prevUserLevel = db.prepare('SELECT * FROM user_levels WHERE user_id = ? AND level_id = ?').get(req.user.id, prevLevel.id);
        if (!prevUserLevel || !prevUserLevel.completed) {
          return res.status(403).json({ error: 'Complete previous level first' });
        }
      }
    }

    const words = db.prepare('SELECT * FROM words WHERE level_id = ?').all(req.params.id);
    const parsed = words.map(w => ({
      ...w,
      examples: JSON.parse(w.examples || '[]'),
      synonyms: JSON.parse(w.synonyms || '[]'),
      antonyms: JSON.parse(w.antonyms || '[]')
    }));

    res.json({ level, words: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/levels/:id/unlock - Unlock a level (after passing test)
router.post('/:id/unlock', authenticate, (req, res) => {
  try {
    db.prepare('UPDATE levels SET is_locked = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
