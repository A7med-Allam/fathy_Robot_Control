# app.py (FastAPI Version)

from fastapi import FastAPI, Request, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import sys
import importlib.util
import inspect
import logging
import httpx  # Using httpx for async requests
import uuid
from werkzeug.utils import secure_filename

# --- Basic Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
# FastAPI instance
app = FastAPI(
    title="Fathy Robot Control System",
    description="API for controlling Fathy Robot and interacting with its services."
)

# --- Add system folder to path ---
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'system'))

# --- Configuration for Main_Workflow ---
MAIN_WORKFLOW_S2S_URL = "http://localhost:5001/s2s"

# --- Mount a static directory to serve index.html, JS, CSS, etc. ---
# Assumes your index.html and favicon.ico are in a 'static' subfolder
static_dir = os.path.join(os.path.dirname(__file__), 'static')
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


class APILoader:
    def __init__(self, system_folder):
        self.system_folder = system_folder
        self.registered_endpoints = []

    def load_api_modules(self):
        print("🔍 Scanning for API modules...")
        for root, dirs, files in os.walk(self.system_folder):
            for file in files:
                if file.endswith('.py') and not file.startswith('__'):
                    module_path = os.path.join(root, file)
                    self.register_module(module_path)
        print(f"✅ Successfully loaded {len(self.registered_endpoints)} API modules")

    def register_module(self, module_path):
        try:
            rel_path = os.path.relpath(module_path, self.system_folder)
            module_name = os.path.splitext(rel_path)[0].replace(os.sep, '.')
            spec = importlib.util.spec_from_file_location(module_name, module_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            for name, func in inspect.getmembers(module, inspect.isfunction):
                if not name.startswith('_'):
                    endpoint_path = f"/api/{rel_path.replace('.py', '').replace(os.sep, '/')}/{name}"
                    self.create_endpoint(endpoint_path, func)
                    self.registered_endpoints.append(endpoint_path)
                    print(f"📌 Registered: {endpoint_path}")
        except Exception as e:
            logger.error(f"Error loading module {module_path}: {e}")

    def create_endpoint(self, path, func):
        """Create a FastAPI endpoint for a function that accepts GET and POST."""

        # Use FastAPI's generic `api_route` to handle both methods
        @app.api_route(path, methods=['GET', 'POST'], response_class=JSONResponse)
        async def endpoint(request: Request):
            try:
                data = {}
                if request.method == 'POST':
                    # Handle potential empty body
                    try:
                        data = await request.json()
                    except:
                        data = {}
                elif request.method == 'GET':
                    data = dict(request.query_params)

                # The loaded functions from your `system` folder might not be async,
                # so we don't `await` the result.
                result = func(data)
                return result
            except Exception as e:
                # Use HTTPException for errors
                raise HTTPException(status_code=500, detail=str(e))

        endpoint.__name__ = f"{path.replace('/', '_')}_endpoint"


# Initialize API loader
system_folder = os.path.join(os.path.dirname(__file__), 'system')
api_loader = APILoader(system_folder)


# --- New S2S Endpoint (Converted for FastAPI) ---
# This function is now `async`
@app.post('/api/robot_functions/talk_to_fathy/execute')
async def talk_to_fathy_s2s(
        audio: UploadFile = File(..., description="Audio file from the browser"),
        whisper_language: str = Form("Auto-Detect", description="Language for Whisper model"),
        xtts_language: str = Form("en", description="Language for XTTS voice generation")
):
    """
    Receives audio, forwards it to Main_Workflow S2S service, and returns the audio response.
    """
    try:
        logger.info(f"Received audio file for S2S: {audio.filename}")

        # Prepare data to send to Main_Workflow
        # We read the file content into memory to forward it
        audio_content = await audio.read()
        files = {'audio': (secure_filename(audio.filename), audio_content, audio.content_type)}
        data_to_forward = {
            'whisper_language': whisper_language,
            'xtts_language': xtts_language
        }

        logger.info(f"Forwarding audio to Main_Workflow at {MAIN_WORKFLOW_S2S_URL}")

        # Use an async-capable HTTP client like httpx
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(MAIN_WORKFLOW_S2S_URL, files=files, data=data_to_forward)

        # Handle the response
        response.raise_for_status()  # This will raise an exception for 4xx/5xx responses

        content_type = response.headers.get('Content-Type', '')
        if 'audio/wav' in content_type:
            logger.info("Received audio response from Main_Workflow. Forwarding to browser.")
            # Use FastAPI's Response class for non-JSON content
            return Response(content=response.content, media_type='audio/wav')
        else:
            logger.error(f"Main_Workflow returned unexpected content type: {content_type}")
            raise HTTPException(status_code=500,
                                detail=f"Main_Workflow returned unexpected content type: {content_type}")

    except httpx.TimeoutException:
        logger.error(f"Timeout calling Main_Workflow at {MAIN_WORKFLOW_S2S_URL}")
        raise HTTPException(status_code=504, detail="Speech processing service timed out.")
    except httpx.RequestError as e:
        logger.error(f"Network error calling Main_Workflow: {e}")
        raise HTTPException(status_code=503, detail="Could not connect to speech processing service.")
    except HTTPException as e:
        # Re-raise known HTTP exceptions
        raise e
    except Exception as e:
        logger.error(f"Internal error in talk_to_fathy_s2s: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# --- Main and System Routes (Converted for FastAPI) ---

@app.get("/", include_in_schema=False)
async def index():
    """Serve the main robot control interface from the static directory."""
    index_path = os.path.join(static_dir, 'index.html')
    if os.path.exists(index_path):
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="index.html not found in static folder.")


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    """Serve the favicon from the static directory."""
    favicon_path = os.path.join(static_dir, 'favicon.ico')
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path, media_type='image/vnd.microsoft.icon')
    return Response(status_code=204)  # No Content


@app.get("/api/system/list")
def api_list():
    """List all available API endpoints."""
    # FastAPI automatically handles dict -> JSON conversion
    return {
        "total_endpoints": len(api_loader.registered_endpoints),
        "endpoints": api_loader.registered_endpoints,
        "system": "Fathy Robot Control System",
        "status": "active"
    }


@app.get("/api/system/status")
def system_status():
    """Get system status."""
    return {
        "system": "Fathy Robot Control System",
        "status": "running",
        "api_modules": len(api_loader.registered_endpoints),
        "server": "Uvicorn (FastAPI)"
    }


# --- Running the App with Uvicorn ---
if __name__ == '__main__':
    print("🤖 FATHY ROBOT CONTROL SYSTEM (FastAPI)")
    print("=" * 40)
    print("🚀 Starting server...")
    api_loader.load_api_modules()
    print("🌐 Server running on http://localhost:5000")
    print("📚 API Docs available at http://localhost:5000/docs")
    print("📱 Touch interface available at http://localhost:5000")
    print("=" * 40)
    # Use uvicorn to run the app
    uvicorn.run(app, host='0.0.0.0', port=5000)