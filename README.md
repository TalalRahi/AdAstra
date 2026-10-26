# 🔭 AdAstra

A web app that identifies space images and explains them. BRAC University CSE 400 thesis project.

Upload a telescope or space image. AdAstra checks that it looks astronomical, tells you what it is and how confident it is, and explains the result at beginner, intermediate or advanced level, with citations.

## Features

- Checks that an image is astronomical before analyzing it (CLIP)
- Classifies it as a constellation, galaxy, nebula, planet or star (EfficientNet-B0, 83.7% test accuracy)
- Labels galaxies as elliptical or spiral (86.3% test accuracy)
- Explains results using a Wikipedia-based knowledge base, with numbered citations (FAISS, LangChain, Gemma)
- "Ask" page for free-form astronomy questions
- Sign-in, analysis history and printable reports
- Moon-phase calculator

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** FastAPI, ONNX Runtime, FAISS, LangChain
- **Data and auth:** MongoDB, Firebase
- **Hosting:** Vercel

## Run Locally

Backend (from `backend/`):

```bash
python -m venv .venv
.venv\Scripts\activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add your GOOGLE_API_KEY and other values
uvicorn main:app --reload --port 8000
```

Frontend (from `frontend/`):

```bash
npm ci
cp .env.example .env.local
npm run dev                   # http://localhost:5173
```

## Tests

```bash
cd backend && pytest -q
```

## Limitations

The classifier always picks one of its five classes, so unusual images can still get a confident wrong answer.

## Author

Talal Rahi · [GitHub](https://github.com/TalalRahi)
