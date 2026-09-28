# AdAstra

**A Web Platform for Astronomical Image Detection, Object Classification, and Knowledge Retrieval**
BRACU CSE 400 thesis project.

Upload a telescope or space image. AdAstra checks that it looks astronomical, names the object,
says how sure it is, and explains the result at three levels (beginner, intermediate, advanced)
using only passages from a curated knowledge base, with numbered citations.

## How it works

```
image upload
  -> validate           PNG / JPEG / WebP / TIFF, max 4 MB
  -> CLIP gate          "does this look astronomical?"  (stops here if not)
  -> classifier         EfficientNet-B0 (ONNX): constellation, galaxy, nebula, planet, star
  -> galaxy shape       second EfficientNet-B0: elliptical vs spiral (galaxies only)
  -> retrieval          FAISS + MiniLM over Wikipedia articles (and any PDFs you add)
  -> explanation        LangChain -> Gemma 4, cites [n], three levels
  -> JSON -> React UI
```

Also: an "Ask" page (free-form questions answered from the same knowledge base), analysis history
per signed-in user, printable reports, a browser-side Moon-phase calculator, and a "Sky" page.

Every model has a clearly labelled demo fallback, so the site never crashes when an artifact is
missing and never presents a placeholder as a real result. Responses carry `mode: live | demo`
and `warnings`.

## Stack

- **Backend:** FastAPI (plain `def` handlers, so a slow request never blocks others), ONNX Runtime,
  FAISS, fastembed (MiniLM), LangChain + Gemma via Google AI Studio, MongoDB Atlas, Firebase Auth.
- **Frontend:** React 19, Vite, TypeScript, Tailwind v4, React Router.
- **Hosting:** two Vercel projects (frontend and backend) from one repository.

## Run locally

Backend (from `backend/`):

```
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # then fill in the values below
uvicorn main:app --reload --port 8000
```

Frontend (from `frontend/`):

```
npm ci
copy .env.example .env.local
npm run dev                       # http://localhost:5173
```

### Backend `.env` values

| Variable | What for |
|---|---|
| `GOOGLE_API_KEY` | Gemma explanations and the Ask page (without it: placeholder text) |
| `GEMMA_MODEL` | default `gemma-4-26b-a4b-it` |
| `CORS_ORIGINS` | the frontend's address(es), comma-separated |
| `FIREBASE_PROJECT_ID` | turns sign-in on (empty = site stays open, for local testing) |
| `MONGODB_URI`, `MONGODB_DB` | accounts and history |
| `MIN_CONFIDENCE`, `MIN_MARGIN` | "uncertain" thresholds for the classifier |
| `CLIP_ASTRO_THRESHOLD` | optional override of the CLIP gate threshold |
| `WIKIPEDIA_CONTACT` | your email, used only when building the knowledge index |

Never commit `.env` files. Model artifacts live in `backend/artifacts/{classifier,galaxy_morphology,clip,knowledge}/`;
each model folder holds a `manifest.json` and an ONNX file, and the server checks the sha256 before using it.

## Build the knowledge index

```
python -m scripts.check_gemma                 # is the API key valid?
python -m scripts.ingest --wikipedia --pdfs   # first build
python -m scripts.ingest --pdfs --append      # add PDFs later
python -m scripts.search "how do spiral galaxies form"
```

An existing index is never overwritten unless you pass `--rebuild`.

## Tests

```
cd backend  && pytest -q      # no model, no API key, no internet needed
cd frontend && npm test       # after: npm install -D vitest
```

## Known limitations

- A classifier always picks one of its five classes. The CLIP gate and the confidence/margin check
  reduce, but do not remove, confident mistakes on unusual images.
- The explanation is written from retrieved passages; it does not correct a wrong classification.
- Class labels differ in capitalisation between the CLIP and classifier manifests; the code compares
  them case-insensitively.