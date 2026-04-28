const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticate } = require('../middleware/auth');

// POST /api/attempts - Submit a test attempt
router.post('/', authenticate, (req, res) => {
  try {
    const { level_id, score, total_questions, answers, attempt_type } = req.body;
    if (!level_id || score === undefined || !total_questions) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const percentage = Math.round((score / total_questions) * 100);

    // Save attempt
    const result = db.prepare(
      'INSERT INTO attempts (user_id, level_id, score, total_questions, answers, attempt_type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, level_id, score, total_questions, JSON.stringify(answers || []), attempt_type || 'test');

    // Update user_levels
    const existing = db.prepare('SELECT * FROM user_levels WHERE user_id = ? AND level_id = ?').get(req.user.id, level_id);
    const levelPassed = percentage >= 80;

    if (existing) {
      db.prepare("UPDATE user_levels SET best_score = MAX(best_score, ?), completed = ?, completed_at = CASE WHEN ? = 1 AND completed = 0 THEN datetime('now') ELSE completed_at END WHERE user_id = ? AND level_id = ?")
        .run(percentage, levelPassed ? 1 : existing.completed, levelPassed ? 1 : 0, req.user.id, level_id);
    } else {
      db.prepare('INSERT INTO user_levels (user_id, level_id, completed, best_score, completed_at) VALUES (?, ?, ?, ?, ?)')
        .run(req.user.id, level_id, levelPassed ? 1 : 0, percentage, levelPassed ? new Date().toISOString() : null);
    }

    // If passed, unlock next level
    if (levelPassed) {
      const currentLevel = db.prepare('SELECT * FROM levels WHERE id = ?').get(level_id);
      if (currentLevel) {
        const nextLevel = db.prepare('SELECT * FROM levels WHERE level_number = ?').get(currentLevel.level_number + 1);
        if (nextLevel) {
          db.prepare('UPDATE levels SET is_locked = 0 WHERE id = ?').run(nextLevel.id);
          // Update user's current level
          db.prepare('UPDATE users SET current_level = MAX(current_level, ?), total_score = total_score + ? WHERE id = ?')
            .run(currentLevel.level_number + 1, score * 10, req.user.id);
        }
      }
    }

    res.json({
      success: true,
      percentage,
      passed: levelPassed,
      attempt_id: result.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attempts/history - Get user attempt history
router.get('/history', authenticate, (req, res) => {
  try {
    const attempts = db.prepare(`
      SELECT a.*, l.level_number, l.title as level_title
      FROM attempts a
      JOIN levels l ON a.level_id = l.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
      LIMIT 50
    `).all(req.user.id);

    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
