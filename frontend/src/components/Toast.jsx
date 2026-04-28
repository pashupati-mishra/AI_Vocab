import React, { useState, useCallback } from 'react';

let toastId = 0;

// Global toast state (shared via event system)
const listeners = new Set();

export function notify(message, type = 'info', duration = 3500) {
  const id = ++toastId;
  listeners.forEach(fn => fn({ id, message, type }));
  setTimeout(() => {
    listeners.forEach(fn => fn({ id, remove: true }));
  }, duration);
}

export function ToastContainer() {
  const [toasts, setToasts] = React.useState([]);

  React.useEffect(() => {
    const handler = (toast) => {
      if (toast.remove) {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      } else {
        setToasts(prev => [...prev.slice(-3), toast]);
      }
    };
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{icons[t.type] || icons.info}</span>
          <span>{t.message}</span>
          <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}>✕</button>
        </div>
      ))}
    </div>
  );
}
