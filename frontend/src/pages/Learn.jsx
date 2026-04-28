import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { notify } from '../components/Toast';

// ── Step 1: Revision Quiz (if previous level exists) ──────────────────────────
function RevisionStep({ prevWords, onComplete }) {
  const questions = prevWords.slice(0, 5).map(w => ({
    word: w,
    question: `What is the meaning of "${w.word}"?`,
    correct: w.meaning_en,
    options: shuffleWith(w.meaning_en, prevWords.filter(x => x.id !== w.id).map(x => x.meaning_en))
  }));

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const handleAnswer = (opt) => {
    if (selected !== null) return;
    setSelected(opt);
    if (opt === questions[current].correct) setScore(s => s + 1);
    setTimeout(() => {
      if (current + 1 < questions.length) {
        setCurrent(c => c + 1);
        setSelected(null);
      } else {
        setDone(true);
      }
    }, 1200);
  };

  if (questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: '3rem' }}>📖</div>
        <h3 style={{ marginTop: 16 }}>No previous words to revise</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Jump straight into new words!</p>
        <button className="btn btn-primary" onClick={() => onComplete(100)}>Continue to Learning →</button>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className={`score-circle ${pct >= 80 ? 'pass' : 'fail'}`} style={{ margin: '0 auto 24px' }}>
          <div className="score-pct">{pct}%</div>
          <div className="score-label">Revision</div>
        </div>
        <h3>{pct >= 80 ? '🎉 Great revision!' : '📚 Needs more practice'}</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: 8, marginBottom: 24 }}>
          You got {score} of {questions.length} correct
        </p>
        <button className="btn btn-primary" onClick={() => onComplete(pct)}>
          {pct >= 80 ? 'Continue to New Words →' : 'Practice More →'}
        </button>
      </div>
    );
  }

  const q = questions[current];
  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>📝 Revision Test</h3>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Test yourself on previous words before new ones</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Question {current + 1} / {questions.length}</span>
        <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>{score} correct</span>
      </div>
      <div className="question-card">
        <div className="question-text">{q.question}</div>
        <div className="options-grid">
          {q.options.map((opt, i) => (
            <button
              key={i}
              className={`option-btn ${selected === opt ? (opt === q.correct ? 'correct' : 'wrong') : selected && opt === q.correct ? 'correct' : ''}`}
              onClick={() => handleAnswer(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Word Cards ─────────────────────────────────────────────────────────
function WordsStep({ words, onComplete }) {
  const [idx, setIdx] = useState(0);
  const word = words[idx];
  const [speaking, setSpeaking] = useState(false);

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.85;
    utt.lang = 'en-US';
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  if (!word) return null;

  return (
    <div>
      <div className="word-nav">
        <button className="btn btn-secondary btn-sm" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>
          ← Previous
        </button>
        <span className="word-counter">Word {idx + 1} of {words.length}</span>
        <button className="btn btn-secondary btn-sm" onClick={() => setIdx(i => Math.min(words.length - 1, i + 1))} disabled={idx === words.length - 1}>
          Next →
        </button>
      </div>

      <div className="word-card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="word-title">{word.word}</div>
            <div className="word-pronunciation">{word.pronunciation}</div>
          </div>
          <button className={`audio-btn ${speaking ? 'playing' : ''}`} onClick={() => speak(word.word)}>
            🔊 {speaking ? 'Playing...' : 'Pronounce'}
          </button>
        </div>

        <div className="word-meaning-en">{word.meaning_en}</div>
        <div className="word-meaning-hi" style={{ marginTop: 6 }}>🇮🇳 {word.meaning_hi}</div>

        <div className="word-section-title">📌 Examples</div>
        <div className="word-examples">
          {word.examples.map((ex, i) => <div key={i} className="word-example">{ex}</div>)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div className="word-section-title">✅ Synonyms</div>
            <div className="word-tags">
              {word.synonyms.map((s, i) => (
                <div key={i} className="word-tag">
                  <div className="tag-word">{s.word}</div>
                  <div className="tag-hindi">{s.meaning_hi}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="word-section-title">❌ Antonyms</div>
            <div className="word-tags">
              {word.antonyms.map((a, i) => (
                <div key={i} className="word-tag">
                  <div className="tag-word">{a.word}</div>
                  <div className="tag-hindi">{a.meaning_hi}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="memory-trick">
          💡 Memory Trick: {word.memory_trick}
        </div>
      </div>

      {idx === words.length - 1 && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button className="btn btn-primary btn-lg" onClick={onComplete}>
            Take the Test 📝
          </button>
        </div>
      )}
    </div>
  );
}

// ── Step 3: Test Section ───────────────────────────────────────────────────────
function TestStep({ words, levelId, onComplete }) {
  const [questions] = useState(() => generateQuestions(words));
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);

  const handleMCQAnswer = (qIdx, opt) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIdx]: opt }));
  };

  const handleFillAnswer = (qIdx, val) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIdx]: val }));
  };

  const handleSubmit = async () => {
    let score = 0;
    const evaluated = questions.map((q, i) => {
      const ans = answers[i] || '';
      const correct = q.type === 'fill'
        ? ans.trim().toLowerCase() === q.correctWord.toLowerCase()
        : ans === q.correct;
      if (correct) score++;
      return { ...q, userAnswer: ans, isCorrect: correct };
    });

    const percentage = Math.round((score / questions.length) * 100);
    setResults({ score, percentage, evaluated });
    setSubmitted(true);

    try {
      await axios.post('/api/attempts', {
        level_id: levelId,
        score,
        total_questions: questions.length,
        answers: evaluated.map(e => ({ question: e.question, user: e.userAnswer, correct: e.correct || e.correctWord, isCorrect: e.isCorrect })),
        attempt_type: 'test'
      });
    } catch (e) { /* silent */ }
  };

  if (submitted && results) {
    return (
      <div>
        <div style={{ textAlign: 'center', padding: '20px 0 32px' }}>
          <div className={`score-circle ${results.percentage >= 80 ? 'pass' : 'fail'}`} style={{ margin: '0 auto 20px' }}>
            <div className="score-pct">{results.percentage}%</div>
            <div className="score-label">{results.score}/{questions.length}</div>
          </div>
          <h2>{results.percentage >= 80 ? '🎉 Level Passed!' : '😅 Keep Practicing'}</h2>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 24px' }}>
            {results.percentage >= 80
              ? 'Excellent! Next level is now unlocked.'
              : 'You need 80% to unlock the next level. Review and try again!'}
          </p>
          <button className="btn btn-primary" onClick={() => onComplete(results.percentage, results.score)}>
            {results.percentage >= 80 ? '🚀 Continue' : '🔁 Review & Retry'}
          </button>
        </div>

        <h3 style={{ marginBottom: 16 }}>📋 Answer Review</h3>
        {results.evaluated.map((q, i) => (
          <div key={i} className="card card-sm" style={{ marginBottom: 12, borderLeft: `4px solid ${q.isCorrect ? 'var(--brand-accent)' : '#FF4757'}` }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{q.question}</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.85rem' }}>
              <span>Your answer: <strong style={{ color: q.isCorrect ? 'var(--brand-accent)' : '#FF4757' }}>{q.userAnswer || '(no answer)'}</strong></span>
              {!q.isCorrect && <span>Correct: <strong style={{ color: 'var(--brand-accent)' }}>{q.correct || q.correctWord}</strong></span>}
            </div>
            {!q.isCorrect && q.explanation && (
              <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                💡 {q.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  const answered = Object.keys(answers).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3>📝 Level Test</h3>
        <span className="badge badge-primary">{answered}/{questions.length} answered</span>
      </div>

      {questions.map((q, qIdx) => (
        <div key={qIdx} className="question-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span className="badge badge-primary" style={{ flexShrink: 0 }}>{qIdx + 1}</span>
            <div className="question-text" style={{ margin: 0 }}>{q.question}</div>
          </div>

          {q.type === 'mcq' && (
            <div className="options-grid" style={{ marginTop: 16 }}>
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  className={`option-btn ${answers[qIdx] === opt ? 'selected' : ''}`}
                  onClick={() => handleMCQAnswer(qIdx, opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {q.type === 'fill' && (
            <div style={{ marginTop: 16 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Type the missing word..."
                value={answers[qIdx] || ''}
                onChange={e => handleFillAnswer(qIdx, e.target.value)}
              />
            </div>
          )}

          {q.type === 'usage' && (
            <div style={{ marginTop: 16 }}>
              <textarea
                className="form-input"
                placeholder="Write your sentence using this word..."
                rows={3}
                value={answers[qIdx] || ''}
                onChange={e => handleFillAnswer(qIdx, e.target.value)}
              />
            </div>
          )}
        </div>
      ))}

      <button
        className="btn btn-primary btn-lg btn-block"
        onClick={handleSubmit}
        disabled={answered < questions.length}
      >
        {answered < questions.length ? `Answer all questions (${answered}/${questions.length})` : '✅ Submit Test'}
      </button>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function shuffleWith(correct, others) {
  const pool = others.slice(0, 3);
  const all = [correct, ...pool].sort(() => Math.random() - 0.5);
  return all.slice(0, 4);
}

function generateQuestions(words) {
  const qs = [];
  // 4 MCQ - meaning
  words.slice(0, 4).forEach(w => {
    const others = words.filter(x => x.id !== w.id);
    qs.push({
      type: 'mcq',
      question: `What is the meaning of "${w.word}"?`,
      correct: w.meaning_en,
      options: shuffleWith(w.meaning_en, others.map(x => x.meaning_en)),
      explanation: `"${w.word}" means: ${w.meaning_en}`
    });
  });

  // 3 Fill in the blank
  words.slice(0, 3).forEach(w => {
    const ex = w.examples?.[0] || `Use ${w.word} in a sentence.`;
    const blanked = ex.replace(new RegExp(w.word, 'gi'), '_____');
    qs.push({
      type: 'fill',
      question: `Fill in the blank: ${blanked}`,
      correctWord: w.word,
      explanation: `The missing word is "${w.word}": ${w.meaning_en}`
    });
  });

  // 2 MCQ - synonym
  words.slice(0, 2).forEach(w => {
    if (!w.synonyms?.length) return;
    const syn = w.synonyms[0]?.word;
    if (!syn) return;
    const others = words.filter(x => x.id !== w.id).flatMap(x => x.synonyms?.map(s => s.word) || []);
    qs.push({
      type: 'mcq',
      question: `Which word is a synonym of "${w.word}"?`,
      correct: syn,
      options: shuffleWith(syn, others.slice(0, 3)),
      explanation: `"${syn}" is a synonym of "${w.word}"`
    });
  });

  // 1 Usage
  if (words[0]) {
    qs.push({
      type: 'usage',
      question: `Write a sentence using the word "${words[0].word}" (${words[0].meaning_en})`,
      correctWord: words[0].word,
      correct: words[0].word,
      isEssay: true,
    });
  }

  return qs.slice(0, 10);
}

// ── Main Learn Page ────────────────────────────────────────────────────────────
export default function Learn() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [prevWords, setPrevWords] = useState([]);
  const [step, setStep] = useState('revision'); // revision | words | test
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`/api/levels/${levelId}/words`);
        setData(res.data);

        // Fetch previous level words
        const prevLevelNum = res.data.level.level_number - 1;
        if (prevLevelNum >= 1) {
          try {
            const prevLevel = await axios.get('/api/levels');
            const pLvl = prevLevel.data.find(l => l.level_number === prevLevelNum);
            if (pLvl && pLvl.word_count > 0) {
              const pWords = await axios.get(`/api/levels/${pLvl.id}/words`);
              setPrevWords(pWords.data.words || []);
            }
          } catch (e) { /* no prev */ }
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load level');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [levelId]);

  const handleRevisionDone = (score) => {
    setStep('words');
  };

  const handleWordsDone = () => {
    setStep('test');
  };

  const handleTestDone = (percentage) => {
    notify(percentage >= 80 ? '🎉 Level passed! Next level unlocked.' : '📚 Practice more to unlock next level.', percentage >= 80 ? 'success' : 'info');
    navigate('/dashboard');
  };

  const steps = ['revision', 'words', 'test'];
  const stepLabels = ['Revision', 'Learn', 'Test'];
  const currentStepIdx = steps.indexOf(step);

  if (loading) return <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" style={{ margin: '60px auto' }} /></div>;
  if (error) return (
    <div className="page-content">
      <div className="empty-state">
        <div className="empty-icon">🔒</div>
        <h3>Cannot Access Level</h3>
        <p>{error}</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
      </div>
    </div>
  );

  const { level, words } = data;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>← Back</button>
          <h1>{level.title}</h1>
        </div>
        <p>{words.length} words • Complete all steps to unlock the next level</p>
      </div>

      <div className="page-content">
        {/* Step Indicator */}
        <div className="step-indicator" style={{ marginBottom: 28 }}>
          {stepLabels.map((label, i) => (
            <React.Fragment key={i}>
              <div className="step">
                <div className={`step-dot ${i < currentStepIdx ? 'done' : i === currentStepIdx ? 'active' : ''}`}>
                  {i < currentStepIdx ? '✓' : i + 1}
                </div>
              </div>
              {i < stepLabels.length - 1 && <div className={`step-line ${i < currentStepIdx ? 'done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="card">
          {step === 'revision' && (
            <RevisionStep prevWords={prevWords} onComplete={handleRevisionDone} />
          )}
          {step === 'words' && (
            words.length === 0
              ? <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <h3>No words in this level yet</h3>
                  <p>Ask an admin to add words to this level</p>
                </div>
              : <WordsStep words={words} onComplete={handleWordsDone} />
          )}
          {step === 'test' && (
            words.length === 0
              ? <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <h3>No words to test</h3>
                </div>
              : <TestStep words={words} levelId={parseInt(levelId)} onComplete={handleTestDone} />
          )}
        </div>
      </div>
    </div>
  );
}
