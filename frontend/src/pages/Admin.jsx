import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { notify } from '../components/Toast';

// ── Tab: Overview ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    axios.get('/api/admin/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  if (!stats) return <div className="spinner" style={{ margin: '40px auto' }} />;

  const cards = [
    { icon: '👥', label: 'Total Users', value: stats.totalUsers, color: '#6C63FF' },
    { icon: '🟢', label: 'Active Today', value: stats.activeUsers, color: '#43E97B' },
    { icon: '📚', label: 'Total Words', value: stats.totalWords, color: '#F7C948' },
    { icon: '📝', label: 'Test Attempts', value: stats.totalAttempts, color: '#FF6584' },
    { icon: '🎯', label: 'Avg. Score', value: `${stats.avgScore}%`, color: '#43E97B' },
  ];

  return (
    <div className="grid grid-3" style={{ marginTop: 16 }}>
      {cards.map((c, i) => (
        <div key={i} className="stat-card">
          <div className="stat-icon" style={{ background: `${c.color}22`, color: c.color }}>{c.icon}</div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Content Management ────────────────────────────────────────────────────
function ContentTab() {
  const [levels, setLevels] = useState([]);
  const [words, setWords] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({ level_number: '', theme: '', difficulty: 'intermediate' });
  const [wordForm, setWordForm] = useState({ level_id: '', word: '', meaning_en: '', meaning_hi: '', pronunciation: '', memory_trick: '' });
  const [showWordForm, setShowWordForm] = useState(false);

  const loadLevels = () => {
    axios.get('/api/admin/levels').then(r => setLevels(r.data));
  };

  useEffect(() => { loadLevels(); }, []);

  const loadWords = (levelId) => {
    setSelectedLevel(levelId);
    axios.get(`/api/admin/words/${levelId}`).then(r => setWords(r.data));
  };

  const toggleLock = async (level) => {
    await axios.put(`/api/admin/levels/${level.id}`, { is_locked: !level.is_locked });
    notify(`Level ${level.level_number} ${level.is_locked ? 'unlocked' : 'locked'}`, 'success');
    loadLevels();
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!genForm.level_number) { notify('Enter a level number', 'error'); return; }
    setGenerating(true);
    try {
      const res = await axios.post('/api/admin/generate-words', genForm);
      notify(`✨ Generated ${res.data.words.length} words for Level ${genForm.level_number}!`, 'success');
      loadLevels();
      if (selectedLevel) loadWords(selectedLevel);
    } catch (err) {
      notify(err.response?.data?.error || 'Generation failed. Check your Gemini API key.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddWord = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/words', {
        ...wordForm,
        level_id: parseInt(wordForm.level_id),
        examples: [],
        synonyms: [],
        antonyms: []
      });
      notify('Word added!', 'success');
      setShowWordForm(false);
      if (selectedLevel) loadWords(selectedLevel);
      loadLevels();
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to add word', 'error');
    }
  };

  const deleteWord = async (id) => {
    if (!confirm('Delete this word?')) return;
    await axios.delete(`/api/admin/words/${id}`);
    notify('Word deleted', 'info');
    if (selectedLevel) loadWords(selectedLevel);
    loadLevels();
  };

  return (
    <div>
      {/* AI Word Generator */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>🤖 AI Word Generator (Gemini)</h3>
        <form onSubmit={handleGenerate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div className="form-group">
            <label className="form-label">Level Number</label>
            <input type="number" className="form-input" placeholder="e.g. 1" min="1" max="20" value={genForm.level_number} onChange={e => setGenForm({ ...genForm, level_number: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Theme (optional)</label>
            <input type="text" className="form-input" placeholder="e.g. Business, Science..." value={genForm.theme} onChange={e => setGenForm({ ...genForm, theme: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Difficulty</label>
            <select className="form-input form-select" value={genForm.difficulty} onChange={e => setGenForm({ ...genForm, difficulty: e.target.value })}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={generating}>
            {generating ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generating...</> : '✨ Generate'}
          </button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Level List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>Levels</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {levels.map(l => (
              <div
                key={l.id}
                className={`card card-sm ${selectedLevel === l.id ? 'card-glow' : ''}`}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }}
                onClick={() => loadWords(l.id)}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Level {l.level_number}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.word_count} words</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className={`badge ${l.is_locked ? 'badge-danger' : 'badge-success'}`}>{l.is_locked ? '🔒' : '🔓'}</span>
                  <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); toggleLock(l); }} style={{ padding: '4px 8px', fontSize: '0.72rem' }}>
                    Toggle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Words List */}
        <div>
          {selectedLevel ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3>Words in Level {levels.find(l => l.id === selectedLevel)?.level_number}</h3>
                <button className="btn btn-primary btn-sm" onClick={() => { setShowWordForm(!showWordForm); setWordForm({ ...wordForm, level_id: selectedLevel }); }}>
                  + Add Word
                </button>
              </div>

              {showWordForm && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <h4 style={{ marginBottom: 14 }}>Add New Word</h4>
                  <form onSubmit={handleAddWord} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Word</label>
                      <input className="form-input" value={wordForm.word} onChange={e => setWordForm({ ...wordForm, word: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Pronunciation</label>
                      <input className="form-input" placeholder="/ˈwɜːrd/" value={wordForm.pronunciation} onChange={e => setWordForm({ ...wordForm, pronunciation: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Meaning (English)</label>
                      <input className="form-input" value={wordForm.meaning_en} onChange={e => setWordForm({ ...wordForm, meaning_en: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Meaning (Hindi)</label>
                      <input className="form-input" value={wordForm.meaning_hi} onChange={e => setWordForm({ ...wordForm, meaning_hi: e.target.value })} required />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                      <label className="form-label">Memory Trick</label>
                      <input className="form-input" value={wordForm.memory_trick} onChange={e => setWordForm({ ...wordForm, memory_trick: e.target.value })} />
                    </div>
                    <div style={{ gridColumn: '1/-1', display: 'flex', gap: 12 }}>
                      <button type="submit" className="btn btn-primary">Save Word</button>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowWordForm(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {words.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <h3>No words yet</h3>
                  <p>Use AI generator or add words manually</p>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Word</th><th>Meaning (EN)</th><th>Pronunciation</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {words.map(w => (
                        <tr key={w.id}>
                          <td style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>{w.word}</td>
                          <td style={{ color: 'var(--text-secondary)', maxWidth: 200 }}>{w.meaning_en}</td>
                          <td style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{w.pronunciation}</td>
                          <td>
                            <button className="btn btn-sm btn-danger" onClick={() => deleteWord(w.id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👈</div>
              <h3>Select a level</h3>
              <p>Click on a level to manage its words</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Bulk Upload ───────────────────────────────────────────────────────────
function BulkUploadTab() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { notify('Select a CSV file', 'error'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post('/api/admin/bulk-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data);
      notify(`Uploaded ${res.data.inserted} words!`, 'success');
    } catch (err) {
      notify(err.response?.data?.error || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    window.open('/api/admin/csv-template', '_blank');
  };

  return (
    <div>
      <div className="card" style={{ maxWidth: 600, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 8 }}>📤 Bulk Upload via CSV</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 16 }}>
          Upload a CSV file with multiple words at once. Download the template first to see the required format.
        </p>

        <button className="btn btn-secondary" onClick={downloadTemplate} style={{ marginBottom: 20 }}>
          ⬇️ Download CSV Template
        </button>

        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Select CSV File</label>
            <input
              type="file"
              accept=".csv"
              className="form-input"
              onChange={e => { setFile(e.target.files[0]); setResult(null); }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={uploading || !file}>
            {uploading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Uploading...</> : '📤 Upload & Process'}
          </button>
        </form>

        {result && (
          <div style={{ marginTop: 20 }}>
            <div className={`badge ${result.inserted > 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
              ✅ Inserted: {result.inserted} / {result.total} words
            </div>
            {result.errors?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ color: '#FF4757', fontSize: '0.85rem', fontWeight: 600 }}>Errors:</p>
                {result.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>• {e.row}: {e.error}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <h4 style={{ marginBottom: 12 }}>📋 CSV Format</h4>
        <div className="table-container">
          <table>
            <thead><tr><th>Column</th><th>Description</th></tr></thead>
            <tbody>
              {[
                ['level', 'Level number (1, 2, 3...)'],
                ['word', 'The vocabulary word'],
                ['meaning_en', 'English meaning/definition'],
                ['meaning_hi', 'Hindi meaning'],
                ['example1', 'First example sentence'],
                ['example2', 'Second example sentence'],
                ['synonym1 / synonym1_hi', 'First synonym + Hindi'],
                ['synonym2 / synonym2_hi', 'Second synonym + Hindi'],
                ['antonym1 / antonym1_hi', 'First antonym + Hindi'],
                ['antonym2 / antonym2_hi', 'Second antonym + Hindi'],
                ['pronunciation', 'Phonetic pronunciation'],
                ['memory_trick', 'Memory trick/mnemonic'],
              ].map(([col, desc]) => (
                <tr key={col}><td style={{ fontFamily: 'monospace', color: 'var(--brand-primary)' }}>{col}</td><td style={{ color: 'var(--text-secondary)' }}>{desc}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: User Management ───────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = () => {
    axios.get('/api/admin/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const toggleBlock = async (u) => {
    await axios.put(`/api/admin/users/${u.id}/block`);
    notify(`User ${u.is_blocked ? 'unblocked' : 'blocked'}`, 'info');
    loadUsers();
  };

  if (loading) return <div className="spinner" style={{ margin: '40px auto' }} />;

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>All Users ({users.length})</h3>
      {users.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">👥</div><h3>No users yet</h3><p>Users will appear here after signing up</p></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Level</th><th>Score</th><th>Streak</th><th>Levels Done</th><th>Last Active</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td><span className="badge badge-primary">L{u.current_level}</span></td>
                  <td style={{ color: 'var(--brand-gold)', fontWeight: 700 }}>{u.total_score}</td>
                  <td>{u.streak} 🔥</td>
                  <td>{u.levels_completed}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{u.last_active ? new Date(u.last_active).toLocaleDateString() : '—'}</td>
                  <td>
                    <span className={`badge ${u.is_blocked ? 'badge-danger' : 'badge-success'}`}>
                      {u.is_blocked ? '🚫 Blocked' : '✅ Active'}
                    </span>
                  </td>
                  <td>
                    <button className={`btn btn-sm ${u.is_blocked ? 'btn-success' : 'btn-danger'}`} onClick={() => toggleBlock(u)}>
                      {u.is_blocked ? 'Unblock' : 'Block'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Admin Page ────────────────────────────────────────────────────────────
export default function Admin() {
  const [tab, setTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'content', label: '📚 Content' },
    { id: 'bulk', label: '📤 Bulk Upload' },
    { id: 'users', label: '👥 Users' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>⚙️ Admin Panel</h1>
        <p>Manage content, users, and AI-generated vocabulary</p>
      </div>

      <div className="page-content">
        <div className="tabs" style={{ marginBottom: 24 }}>
          {tabs.map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab />}
        {tab === 'content' && <ContentTab />}
        {tab === 'bulk' && <BulkUploadTab />}
        {tab === 'users' && <UsersTab />}
      </div>
    </div>
  );
}
