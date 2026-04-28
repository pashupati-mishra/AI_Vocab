const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { GoogleGenAI } = require('@google/genai');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const upload = multer({ dest: 'uploads/' });

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// POST /api/admin/generate-words - Generate vocabulary using Gemini AI
router.post('/generate-words', authenticate, requireAdmin, async (req, res) => {
  try {
    const { level_number, theme, difficulty } = req.body;
    if (!level_number) return res.status(400).json({ error: 'level_number required' });



    const prompt = `You are an expert English vocabulary teacher. Generate exactly 5 vocabulary words${theme ? ` related to the theme: "${theme}"` : ''} suitable for ${difficulty || 'intermediate'} level learners.

For each word, provide the following in valid JSON format:
{
  "words": [
    {
      "word": "string",
      "meaning_en": "Clear English definition in 1-2 sentences",
      "meaning_hi": "Hindi meaning/definition",
      "examples": ["Example sentence 1 using the word", "Example sentence 2 using the word"],
      "synonyms": [
        {"word": "synonym1", "meaning_hi": "Hindi meaning"},
        {"word": "synonym2", "meaning_hi": "Hindi meaning"}
      ],
      "antonyms": [
        {"word": "antonym1", "meaning_hi": "Hindi meaning"},
        {"word": "antonym2", "meaning_hi": "Hindi meaning"}
      ],
      "pronunciation": "phonetic pronunciation e.g. /ˈwɜːrd/",
      "memory_trick": "A creative mnemonic or memory trick to remember this word"
    }
  ]
}

Make sure words are practical, commonly used in professional and daily contexts, and the Hindi translations are accurate. Return ONLY the JSON, no extra text.`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const text = result.text;

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Failed to parse AI response' });

    const parsed = JSON.parse(jsonMatch[0]);
    const words = parsed.words;

    // Find or create level
    let level = db.prepare('SELECT * FROM levels WHERE level_number = ?').get(level_number);
    if (!level) {
      const lr = db.prepare('INSERT OR IGNORE INTO levels (level_number, title, is_locked) VALUES (?, ?, ?)').run(level_number, `Level ${level_number}`, level_number === 1 ? 0 : 1);
      level = db.prepare('SELECT * FROM levels WHERE id = ?').get(lr.lastInsertRowid);
    }

    // Delete existing words for this level (regenerate)
    db.prepare('DELETE FROM words WHERE level_id = ?').run(level.id);

    // Insert new words
    const insertWord = db.prepare(`
      INSERT INTO words (level_id, word, meaning_en, meaning_hi, examples, synonyms, antonyms, pronunciation, memory_trick)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((words) => {
      for (const w of words) {
        insertWord.run(
          level.id,
          w.word,
          w.meaning_en,
          w.meaning_hi,
          JSON.stringify(w.examples || []),
          JSON.stringify(w.synonyms || []),
          JSON.stringify(w.antonyms || []),
          w.pronunciation,
          w.memory_trick
        );
      }
    });

    insertMany(words);

    res.json({ success: true, level, words });
  } catch (err) {
    console.error('Gemini generation error:', err);
    res.status(500).json({ error: err.message || 'AI generation failed' });
  }
});

// POST /api/admin/bulk-upload - Upload CSV of words
router.post('/bulk-upload', authenticate, requireAdmin, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const results = [];
    const filePath = req.file.path;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => {
        try {
          let inserted = 0;
          let errors = [];

          const insertWord = db.prepare(`
            INSERT INTO words (level_id, word, meaning_en, meaning_hi, examples, synonyms, antonyms, pronunciation, memory_trick)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const insertBulk = db.transaction(() => {
            for (const row of results) {
              try {
                let level = db.prepare('SELECT * FROM levels WHERE level_number = ?').get(parseInt(row.level));
                if (!level) {
                  const lr = db.prepare('INSERT OR IGNORE INTO levels (level_number, title, is_locked) VALUES (?, ?, ?)').run(parseInt(row.level), `Level ${row.level}`, 1);
                  level = db.prepare('SELECT * FROM levels WHERE level_number = ?').get(parseInt(row.level));
                }

                const synonyms = [
                  { word: row.synonym1 || '', meaning_hi: row.synonym1_hi || '' },
                  { word: row.synonym2 || '', meaning_hi: row.synonym2_hi || '' }
                ];
                const antonyms = [
                  { word: row.antonym1 || '', meaning_hi: row.antonym1_hi || '' },
                  { word: row.antonym2 || '', meaning_hi: row.antonym2_hi || '' }
                ];

                insertWord.run(
                  level.id,
                  row.word,
                  row.meaning_en,
                  row.meaning_hi,
                  JSON.stringify([row.example1, row.example2].filter(Boolean)),
                  JSON.stringify(synonyms),
                  JSON.stringify(antonyms),
                  row.pronunciation || '',
                  row.memory_trick || ''
                );
                inserted++;
              } catch (e) {
                errors.push({ row: row.word, error: e.message });
              }
            }
          });

          insertBulk();
          fs.unlinkSync(filePath);
          res.json({ success: true, inserted, errors, total: results.length });
        } catch (err) {
          fs.unlinkSync(filePath);
          res.status(500).json({ error: err.message });
        }
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/csv-template - Download CSV template
router.get('/csv-template', authenticate, requireAdmin, (req, res) => {
  const headers = 'level,word,meaning_en,meaning_hi,example1,example2,synonym1,synonym1_hi,synonym2,synonym2_hi,antonym1,antonym1_hi,antonym2,antonym2_hi,pronunciation,memory_trick\n';
  const sample = '1,Eloquent,Fluent and persuasive in speaking or writing,वाक्पटु,"She gave an eloquent speech","His eloquent writing moved the audience",Articulate,स्पष्टवक्ता,Fluent,धाराप्रवाह,Inarticulate,अस्पष्ट,Mute,मूक,/ˈɛl.ə.kwənt/,"EL-o-quent: ELLA was ELOQUENT like a queen speaking"';
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=vocab_template.csv');
  res.send(headers + sample);
});

// GET /api/admin/users - Get all users
router.get('/users', authenticate, requireAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.email, u.name, u.current_level, u.total_score, u.streak, u.last_active, u.is_admin, u.is_blocked, u.created_at,
             COUNT(DISTINCT ul.level_id) as levels_completed
      FROM users u
      LEFT JOIN user_levels ul ON u.id = ul.user_id AND ul.completed = 1
      WHERE u.is_admin = 0
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/block - Block/unblock a user
router.put('/users/:id/block', authenticate, requireAdmin, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newStatus = user.is_blocked ? 0 : 1;
    db.prepare('UPDATE users SET is_blocked = ? WHERE id = ?').run(newStatus, req.params.id);
    res.json({ success: true, is_blocked: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/levels - Get all levels with word counts
router.get('/levels', authenticate, requireAdmin, (req, res) => {
  try {
    const levels = db.prepare(`
      SELECT l.*, COUNT(w.id) as word_count
      FROM levels l LEFT JOIN words w ON l.id = w.level_id
      GROUP BY l.id ORDER BY l.level_number
    `).all();
    res.json(levels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/levels/:id - Update level (lock/unlock)
router.put('/levels/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const { is_locked, title } = req.body;
    if (title !== undefined) {
      db.prepare('UPDATE levels SET title = ? WHERE id = ?').run(title, req.params.id);
    }
    if (is_locked !== undefined) {
      db.prepare('UPDATE levels SET is_locked = ? WHERE id = ?').run(is_locked ? 1 : 0, req.params.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/words/:level_id - Get words for a level (admin)
router.get('/words/:level_id', authenticate, requireAdmin, (req, res) => {
  try {
    const words = db.prepare('SELECT * FROM words WHERE level_id = ?').all(req.params.level_id);
    const parsed = words.map(w => ({
      ...w,
      examples: JSON.parse(w.examples || '[]'),
      synonyms: JSON.parse(w.synonyms || '[]'),
      antonyms: JSON.parse(w.antonyms || '[]')
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/words - Add a word manually
router.post('/words', authenticate, requireAdmin, (req, res) => {
  try {
    const { level_id, word, meaning_en, meaning_hi, examples, synonyms, antonyms, pronunciation, memory_trick } = req.body;
    if (!level_id || !word || !meaning_en || !meaning_hi) {
      return res.status(400).json({ error: 'Required fields missing' });
    }
    const result = db.prepare(`
      INSERT INTO words (level_id, word, meaning_en, meaning_hi, examples, synonyms, antonyms, pronunciation, memory_trick)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(level_id, word, meaning_en, meaning_hi, JSON.stringify(examples || []), JSON.stringify(synonyms || []), JSON.stringify(antonyms || []), pronunciation || '', memory_trick || '');

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/words/:id - Delete a word
router.delete('/words/:id', authenticate, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM words WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats - Dashboard stats
router.get('/stats', authenticate, requireAdmin, (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE is_admin = 0').get().cnt;
    const activeUsers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE is_admin = 0 AND date(last_active) = date('now')").get().cnt;
    const totalWords = db.prepare('SELECT COUNT(*) as cnt FROM words').get().cnt;
    const totalAttempts = db.prepare('SELECT COUNT(*) as cnt FROM attempts').get().cnt;
    const avgScore = db.prepare('SELECT AVG(score * 100.0 / total_questions) as avg FROM attempts').get().avg;

    res.json({ totalUsers, activeUsers, totalWords, totalAttempts, avgScore: Math.round(avgScore || 0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
