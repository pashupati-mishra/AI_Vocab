const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticate } = require('../middleware/auth');

// GET /api/progress - Get current user's full progress
router.get('/', authenticate, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, name, current_level, total_score, streak, last_active, is_admin FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const completedLevels = db.prepare('SELECT COUNT(*) as cnt FROM user_levels WHERE user_id = ? AND completed = 1').get(req.user.id).cnt;

    const recentAttempts = db.prepare(`
      SELECT a.*, l.level_number, l.title as level_title
      FROM attempts a JOIN levels l ON a.level_id = l.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC LIMIT 10
    `).all(req.user.id);

    const levelProgress = db.prepare(`
      SELECT ul.*, l.level_number, l.title
      FROM user_levels ul JOIN levels l ON ul.level_id = l.id
      WHERE ul.user_id = ?
      ORDER BY l.level_number
    `).all(req.user.id);

    // Find weak words (words from levels with attempts < 80%)
    const weakAttempts = db.prepare(`
      SELECT a.level_id, MIN(a.score * 100.0 / a.total_questions) as min_score
      FROM attempts a WHERE a.user_id = ? GROUP BY a.level_id HAVING min_score < 80
    `).all(req.user.id);

    const weakLevelIds = weakAttempts.map(a => a.level_id);
    let weakWords = [];
    if (weakLevelIds.length > 0) {
      const placeholders = weakLevelIds.map(() => '?').join(',');
      weakWords = db.prepare(`SELECT * FROM words WHERE level_id IN (${placeholders}) LIMIT 20`).all(...weakLevelIds);
    }

    res.json({ user, completedLevels, recentAttempts, levelProgress, weakWords });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
