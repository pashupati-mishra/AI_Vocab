# 🧠 AI Vocab – AI-Powered Vocabulary Improvement App

A full-stack web application for vocabulary learning using the **Gemini AI API**, built with:
- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (local file, no setup required)

---

## 🚀 Quick Start

### 1. Configure Your Gemini API Key
Open `backend/.env` and replace `YOUR_GEMINI_API_KEY_HERE`:
```
GEMINI_API_KEY=your_actual_key_here
```
Get your key at: https://aistudio.google.com/app/apikey

### 2. Start the Backend
```bash
cd backend
npm run dev
```
Backend runs at: http://localhost:5000

### 3. Start the Frontend
```bash
cd frontend
npm run dev
```
Frontend runs at: http://localhost:5173

---

## 🔐 Default Admin Account
- **Email**: `admin@aivocab.com`
- **Password**: `admin123`

---

## 📚 Features

### User Features
- ✅ Register / Login with JWT auth
- ✅ Level-based vocabulary learning (20 levels)
- ✅ Revision quiz from previous level words
- ✅ Word cards with meanings (EN + Hindi), examples, synonyms, antonyms
- ✅ 🔊 Audio pronunciation (Browser Speech API)
- ✅ Memory tricks (mnemonics)
- ✅ 10-question test per level (MCQ + Fill-in-blank + Usage)
- ✅ Auto-scoring: 80%+ unlocks next level
- ✅ Progress tracking with weak word identification
- ✅ 🔥 Daily streak system
- ✅ Dark / Light mode

### Admin Features
- ✅ 🤖 AI Word Generation via Gemini API (5 words per level per prompt)
- ✅ Bulk CSV upload with downloadable template
- ✅ Manual word add/delete
- ✅ Level lock/unlock control
- ✅ User management (view, block/unblock)
- ✅ Platform stats overview

---

## 📁 Project Structure

```
AI_Vocab/
├── backend/
│   ├── database/
│   │   └── db.js             # SQLite setup & seeding
│   ├── middleware/
│   │   └── auth.js           # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js           # /api/auth/*
│   │   ├── levels.js         # /api/levels/*
│   │   ├── attempts.js       # /api/attempts/*
│   │   ├── progress.js       # /api/progress
│   │   └── admin.js          # /api/admin/*
│   ├── uploads/              # Temp CSV uploads
│   ├── .env                  # Config (API key here!)
│   ├── server.js             # Express entry point
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── context/
    │   │   ├── AuthContext.jsx
    │   │   └── ThemeContext.jsx
    │   ├── components/
    │   │   ├── Sidebar.jsx
    │   │   └── Toast.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Signup.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Learn.jsx     # Full learning flow
    │   │   ├── Progress.jsx
    │   │   └── Admin.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css         # Complete design system
    ├── vite.config.js
    └── index.html
```

---

## 🗄️ Database Schema

| Table | Description |
|-------|-------------|
| `users` | Auth, progress, streak |
| `levels` | Level metadata, lock status |
| `words` | Vocab words with all fields |
| `attempts` | Test history per user/level |
| `user_levels` | User-level completion tracking |

---

## 📤 CSV Bulk Upload Format

Download the template from Admin → Bulk Upload → "Download CSV Template"

| Column | Description |
|--------|-------------|
| level | Level number |
| word | The word |
| meaning_en | English definition |
| meaning_hi | Hindi meaning |
| example1, example2 | Usage examples |
| synonym1, synonym1_hi | Synonym + Hindi |
| synonym2, synonym2_hi | Synonym + Hindi |
| antonym1, antonym1_hi | Antonym + Hindi |
| antonym2, antonym2_hi | Antonym + Hindi |
| pronunciation | Phonetic e.g. /ˈwɜːrd/ |
| memory_trick | Mnemonic trick |

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| GET | /api/levels | All levels with progress |
| GET | /api/levels/:id/words | Words for a level |
| POST | /api/attempts | Submit test |
| GET | /api/progress | User full progress |
| POST | /api/admin/generate-words | AI generate (admin) |
| POST | /api/admin/bulk-upload | CSV upload (admin) |
| GET | /api/admin/users | All users (admin) |
| GET | /api/admin/stats | Platform stats (admin) |
