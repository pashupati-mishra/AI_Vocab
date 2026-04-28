import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [levels, setLevels] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/levels'),
      axios.get('/api/progress')
    ]).then(([lvlRes, progRes]) => {
      setLevels(lvlRes.data);
      setProgress(progRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const completedCount = progress?.completedLevels || 0;
  const totalLevels = levels.length;
  const overallPct = totalLevels > 0 ? Math.round((completedCount / totalLevels) * 100) : 0;

  const stats = [
    { icon: '⚡', label: 'Current Level', value: user?.current_level || 1, color: '#6C63FF', bg: 'rgba(108,99,255,0.1)' },
    { icon: '🏆', label: 'Total Score', value: user?.total_score || 0, color: '#F7C948', bg: 'rgba(247,201,72,0.1)' },
    { icon: '✅', label: 'Levels Done', value: completedCount, color: '#43E97B', bg: 'rgba(67,233,123,0.1)' },
    { icon: '🔥', label: 'Day Streak', value: `${user?.streak || 0}`, color: '#FF6584', bg: 'rgba(255,101,132,0.1)' },
  ];

  if (loading) return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div className="spinner" style={{ margin: '60px auto' }} />
    </div>
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Track your vocabulary journey and unlock new levels</p>
        </div>
        {user?.streak > 0 && (
          <div className="streak-badge">
            🔥 {user.streak} day streak
          </div>
        )}
      </div>

      <div className="page-content">
        {/* Stats Grid */}
        <div className="grid grid-4" style={{ marginBottom: 28 }}>
          {stats.map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div className="stat-info">
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Overall Progress */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>Overall Progress</h3>
            <span style={{ color: 'var(--brand-primary)', fontWeight: 700, fontSize: '1.1rem' }}>{overallPct}%</span>
          </div>
          <div className="progress-bar progress-bar-lg">
            <div className="progress-fill" style={{ width: `${overallPct}%` }} />
          </div>
          <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {completedCount} of {totalLevels} levels completed
          </p>
        </div>

        {/* Levels Grid */}
        <h2 style={{ marginBottom: 16 }}>All Levels</h2>
        <div className="grid grid-4">
          {levels.map(level => {
            const isCompleted = level.user_progress?.completed;
            const isCurrent = level.level_number === user?.current_level;
            const isLocked = level.is_locked && !isCompleted && !isCurrent;
            const bestScore = level.user_progress?.best_score || 0;

            return (
              <div
                key={level.id}
                className={`level-card ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                onClick={() => !isLocked && navigate(`/learn/${level.id}`)}
              >
                <div className="level-lock-icon">
                  {isCompleted ? '✅' : isLocked ? '🔒' : isCurrent ? '⚡' : '📖'}
                </div>
                <div className="level-number" style={{ color: isCompleted ? 'var(--brand-accent)' : isCurrent ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>
                  {level.level_number}
                </div>
                <div className="level-title">{level.title}</div>
                <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-muted)' }}>
                  {level.word_count} words
                </div>

                {bestScore > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div className="progress-bar progress-bar-sm">
                      <div className="progress-fill" style={{ width: `${bestScore}%` }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>{bestScore}% best</div>
                  </div>
                )}

                {isLocked && level.word_count === 0 && (
                  <div className="level-status" style={{ color: 'var(--text-muted)' }}>No content yet</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Weak Words Section */}
        {progress?.weakWords?.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ marginBottom: 16 }}>⚠️ Words to Review</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {progress.weakWords.slice(0, 20).map(w => (
                <div key={w.id} className="chip" style={{ background: 'rgba(255,71,87,0.1)', borderColor: 'rgba(255,71,87,0.3)', color: '#FF4757' }}>
                  📌 {w.word}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
