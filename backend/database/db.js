const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'vocab.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    current_level INTEGER DEFAULT 1,
    total_score INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    last_active TEXT,
    is_admin INTEGER DEFAULT 0,
    is_blocked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level_number INTEGER UNIQUE NOT NULL,
    title TEXT NOT NULL,
    is_locked INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level_id INTEGER NOT NULL,
    word TEXT NOT NULL,
    meaning_en TEXT NOT NULL,
    meaning_hi TEXT NOT NULL,
    examples TEXT NOT NULL,
    synonyms TEXT NOT NULL,
    antonyms TEXT NOT NULL,
    pronunciation TEXT NOT NULL,
    memory_trick TEXT NOT NULL,
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    level_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    answers TEXT NOT NULL,
    attempt_type TEXT DEFAULT 'test',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    level_id INTEGER NOT NULL,
    completed INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    completed_at TEXT,
    UNIQUE(user_id, level_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
  );
`);

// Seed initial levels 1-20 (Level 1 unlocked by default)
const seedLevels = db.prepare('INSERT OR IGNORE INTO levels (level_number, title, is_locked) VALUES (?, ?, ?)');
for (let i = 1; i <= 20; i++) {
  seedLevels.run(i, `Level ${i}`, i === 1 ? 0 : 1);
}

// Seed admin user
const bcrypt = require('bcrypt');
const adminEmail = process.env.ADMIN_EMAIL || 'admin@aivocab.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!existing) {
  const hash = bcrypt.hashSync(adminPassword, 10);
  db.prepare('INSERT INTO users (email, password_hash, name, is_admin) VALUES (?, ?, ?, 1)')
    .run(adminEmail, hash, 'Administrator');
}

module.exports = db;
