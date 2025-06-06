from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .database import engine 
from .models import Base 
from .api import projects as projects_api 
from .api import videos as videos_api     
from .api import public as public_api 

app = FastAPI(title="Video Processor API")

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine) 
    print("Database tables checked/created.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://127.0.0.1:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "/app/uploaded_videos" 
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/static_videos", StaticFiles(directory=UPLOAD_DIR), name="static_videos")

app.include_router(projects_api.router)
app.include_router(videos_api.router)
app.include_router(public_api.router) 

@app.get("/")
async def root():
    return {"message": "Welcome to the Video Processor API"}