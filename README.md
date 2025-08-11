## Main Robot Control (FastAPI)

FastAPI-based robot control service with a simple web UI and an endpoint to forward speech-to-speech requests to an external workflow.

### Features

- FastAPI + Uvicorn server
- Static assets served from `static/`
- Speech-to-Speech proxy endpoint for `talk_to_fathy`
- System info endpoints: list and status

### Project structure

```
Main_robot_controle/
├── app.py                         # FastAPI application entrypoint
├── start.sh                       # Helper script to create venv, install deps, run server
├── static/
│   ├── css/styles.css
│   └── js/app.js
├── templates/
│   └── index.html                 # Optional UI page
├── system/
│   ├── robot_functions/
│   │   ├── basic_tour.py
│   │   ├── heart_inspection.py
│   │   ├── shake_hand.py
│   │   └── talk_to_fathy.py
│   └── utilities/
│       └── status_check.py
├── requirements.txt
└── README.md
```

Note: The FastAPI app auto-loads modules from the top-level `system/` folder next to `app.py`.

### Prerequisites

- Python 3.9+

### Installation

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Running

Option A: run the module directly (uvicorn is started from `app.py`)

```bash
python app.py
```

Option B: run with uvicorn (recommended during development)

```bash
uvicorn app:app --host 0.0.0.0 --port 5000 --reload
```

Or use the helper script:

```bash
bash start.sh
```

### Configuration

- In `app.py`, update `MAIN_WORKFLOW_S2S_URL` to point to your external Speech-to-Speech service.

### Endpoints

- GET `/` → serves UI (expects `static/index.html`)
- GET `/api/system/list` → list of dynamically registered endpoints
- GET `/api/system/status` → basic status
- Dynamic endpoints (auto-generated from `system/`):
  - `/api/robot_functions/<module>/<function>` (e.g. `/api/robot_functions/shake_hand/execute`)
  - `/api/utilities/<module>/<function>` (e.g. `/api/utilities/status_check/execute`)
- POST `/api/robot_functions/talk_to_fathy/execute` → multipart form with fields:
  - `audio`: audio file (wav)
  - `whisper_language`: language code (e.g. "en")
  - `xtts_language`: language code (e.g. "en")
  Returns `audio/wav` on success.



### License

MIT

