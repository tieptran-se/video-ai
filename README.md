# Video Processor Monorepo

This project is a web application designed for processing videos to extract transcripts using OpenAI. It features an Angular frontend for user interaction and a Python (FastAPI) backend to handle video uploads, processing, and data storage in a PostgreSQL database. The entire application is containerized using Docker and managed with Docker Compose.

## Features

* **Project-Based Organization:** Users can create separate projects for different video processing tasks.
* **Video Upload:** Secure video file uploads from the frontend to the backend.
* **AI-Powered Transcription:** Utilizes OpenAI's Whisper model to generate video transcripts.
* **Timestamped Transcripts:** Transcripts are generated with timestamps for each segment.
* **Interactive Playback:** Users can click on transcript segments to seek to the corresponding timestamp in the video player.
* **Progress Indication:** Displays progress bars during video upload and processing.
* **Modern UI/UX:**
    * Sidebar-based navigation.
    * Responsive design with Tailwind CSS.
    * Angular Material components for a clean and consistent look.
* **Containerized Deployment:** Dockerized services (frontend, backend, database) orchestrated with Docker Compose for easy setup and deployment.
* **Automatic API Documentation:** FastAPI backend provides automatic Swagger UI and ReDoc API documentation.

## Tech Stack

* **Frontend:**
    * Angular (v17+ with Standalone Components & new control flow syntax)
    * TypeScript
    * Tailwind CSS
    * Angular Material
* **Backend:**
    * Python 3.9+
    * FastAPI
    * SQLAlchemy (for ORM)
    * Pydantic (for data validation)
    * OpenAI Python SDK (for Whisper transcription)
    * Uvicorn (ASGI server)
* **Database:**
    * PostgreSQL
* **Orchestration & Containerization:**
    * Docker
    * Docker Compose
* **Audio Extraction:**
    * FFmpeg

## Prerequisites

* Docker Desktop (or Docker Engine and Docker Compose CLI) installed and running.
* An OpenAI API Key.
* Node.js and npm (if you plan to modify the Angular frontend locally outside Docker).
* Python (if you plan to modify the Python backend locally outside Docker).

## Project Structure


video-processor-monorepo/
├── frontend-angular/       # Angular application (standalone components)
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/ # Standalone UI components
│   │   │   ├── services/   # API service
│   │   │   ├── app.config.ts
│   │   │   ├── app.routes.ts
│   │   │   └── app.component.ts
│   ├── Dockerfile
│   ├── tailwind.config.js
│   └── ...
├── backend-python/         # Python FastAPI application
│   ├── app/
│   │   ├── api/            # API routers (projects, videos)
│   │   ├── services/       # Video processing logic (OpenAI, FFmpeg)
│   │   ├── crud.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── main.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example        # (Optional: for local non-Docker dev)
├── docker-compose.yml      # Docker Compose configuration
└── README.md


## Setup and Running the Application

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd video-processor-monorepo
    ```

2.  **Configure Environment Variables:**
    * In the `docker-compose.yml` file, locate the `backend` service.
    * Update the `OPENAI_API_KEY` environment variable with your actual OpenAI API key:
        ```yaml
        environment:
          DATABASE_URL: postgresql://user:password@db:5432/video_processor_db
          OPENAI_API_KEY: "YOUR_ACTUAL_OPENAI_API_KEY_HERE"
        ```
    * (Optional) You can also create a `.env` file in the `backend-python` directory for local development outside Docker, based on `.env.example`.

3.  **Build and Run with Docker Compose:**
    From the root directory of the project (`video-processor-monorepo`), run:
    ```bash
    docker-compose up --build
    ```
    * The `--build` flag ensures that Docker images are rebuilt if there are any changes (e.g., in Dockerfiles or requirements).
    * To run in detached mode (in the background), add the `-d` flag: `docker-compose up --build -d`.

4.  **Accessing the Application:**
    * **Frontend (Angular App):** Open your browser and navigate to `http://localhost:4200`
    * **Backend API (FastAPI):** The API will be accessible at `http://localhost:8000`
        * **Swagger UI API Docs:** `http://localhost:8000/docs`
        * **ReDoc API Docs:** `http://localhost:8000/redoc`

5.  **Stopping the Application:**
    * If running in the foreground, press `Ctrl+C` in the terminal where `docker-compose up` is running.
    * If running in detached mode, use: `docker-compose down`

## Development

### Frontend (Angular)

* The Angular project is located in the `frontend-angular` directory.
* If you need to install dependencies or run Angular CLI commands locally (outside Docker), navigate to this directory:
    ```bash
    cd frontend-angular
    npm install
    ng serve # For local development server
    ```

### Backend (Python/FastAPI)

* The Python backend project is in the `backend-python` directory.
* The `Dockerfile` for the backend handles Python dependencies. If developing locally, you might want to set up a virtual environment:
    ```bash
    cd backend-python
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    # To run locally (ensure PostgreSQL is accessible and DATABASE_URL is set):
    # uvicorn app.main:app --reload --port 8000
    ```

## Potential Future Enhancements

* User authentication and authorization.
* More robust error handling and user feedback.
* Support for more video/audio formats.
* Advanced transcript editing features.
* Summarization of transcripts.
* Speaker diarization (identifying different speakers).
* Integration with other AI services for further content analysis.
* Scalable background task processing using Celery and Redis/RabbitMQ.
* Unit and integration tests for both frontend and backend.
* CI/CD pipeline for automated testing and deployment.
