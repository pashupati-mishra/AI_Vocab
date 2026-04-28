import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Progress() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/progress')
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" style={{ margin: '60px auto' }} /></div>;
  if (!data) return null;

  const { completedLevels, recentAttempts, levelProgress, weakWords } = data;

  return (
    <div>
      <div className="page-header">
        <h1>📈 Your Progress</h1>
        <p>Track your learning journey and performance trends</p>
      </div>

      <div className="page-content">
        {/* Summary Cards */}
        <div className="grid grid-3" style={{ marginBottom: 28 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--brand-primary)' }}>{completedLevels}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Levels Completed</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--brand-gold)' }}>{user?.total_score || 0}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Score</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--brand-secondary)' }}>{user?.streak || 0} 🔥</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Day Streak</div>
          </div>
        </div>

        {/* Level Progress Table */}
        {levelProgress.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ marginBottom: 16 }}>Level Performance</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Level</th>
                    <th>Best Score</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {levelProgress.map(lp => (
                    <tr key={lp.id}>
                      <td style={{ fontWeight: 600 }}>Level {lp.level_number} – {lp.title}</td>
                      <td><span style={{ color: lp.best_score >= 80 ? 'var(--brand-accent)' : 'var(--brand-secondary)', fontWeight: 700 }}>{lp.best_score}%</span></td>
                      <td>
                        <span className={`badge ${lp.completed ? 'badge-success' : 'badge-warning'}`}>
                          {lp.completed ? '✅ Completed' : '🔄 In Progress'}
                        </span>
                      </td>
                      <td style={{ width: 140 }}>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${lp.best_score}%` }} />
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {lp.completed_at ? new Date(lp.completed_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Attempts */}
        {recentAttempts.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ marginBottom: 16 }}>Recent Attempts</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Level</th>
                    <th>Score</th>
                    <th>Type</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttempts.map(a => {
                    const pct = Math.round((a.score / a.total_questions) * 100);
                    return (
                      <tr key={a.id}>
                        <td>{a.level_title}</td>
                        <td>
                          <span style={{ color: pct >= 80 ? 'var(--brand-accent)' : '#FF4757', fontWeight: 700 }}>
                            {pct}% ({a.score}/{a.total_questions})
                          </span>
                        </td>
                        <td><span className="badge badge-primary">{a.attempt_type}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{new Date(a.created_at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Weak Words */}
        {weakWords?.length > 0 && (
          <div>
            <h2 style={{ marginBottom: 16 }}>⚠️ Words That Need Attention</h2>
            <div className="grid grid-3">
              {weakWords.slice(0, 9).map(w => (
                <div key={w.id} className="card card-sm">
                  <div style={{ fontWeight: 700, color: 'var(--brand-secondary)' }}>{w.word}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{w.meaning_en}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {levelProgress.length === 0 && recentAttempts.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No data yet</h3>
            <p>Start learning to see your progress here</p>
          </div>
        )}
      </div>
    </div>
  );
}
