from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, BackgroundTasks, Response, status as http_status
from sqlalchemy.orm import Session
import shutil
import os
import uuid
from typing import List, Optional 

from .. import crud, schemas, database, models 
from ..services import transcription_service 

router = APIRouter(
    prefix="/projects",
    tags=["projects"],
)

UPLOAD_DIR = "/app/uploaded_videos" 

@router.post("/", response_model=schemas.ProjectSchema)
def create_project_endpoint(project: schemas.ProjectCreate, db: Session = Depends(database.get_db)):
    db_project = crud.get_project_by_name(db, name=project.name)
    if db_project:
        raise HTTPException(status_code=400, detail="Project name already registered")
    return crud.create_project(db=db, project=project)

@router.get("/", response_model=List[schemas.ProjectSchema])
def read_projects_endpoint(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    projects = crud.get_projects(db, skip=skip, limit=limit)
    return projects

@router.get("/{project_id}", response_model=schemas.ProjectSchema)
def read_project_endpoint(project_id: int, db: Session = Depends(database.get_db)):
    db_project = crud.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@router.post("/{project_id}/upload_video/", response_model=schemas.VideoSchema)
async def upload_video_for_project_endpoint(
    project_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    project = crud.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    unique_id = uuid.uuid4()
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ".mp4" 
    if not file_extension: 
        file_extension = ".mp4"
    unique_filename = f"{unique_id}{file_extension}"
    
    os.makedirs(UPLOAD_DIR, exist_ok=True) 
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"Video saved to: {file_path}")
    except Exception as e:
        print(f"Error saving video: {e}")
        raise HTTPException(status_code=500, detail=f"Could not save video file: {e}")
    finally:
        if file and hasattr(file, 'file') and file.file: 
            file.file.close()

    video_data = schemas.VideoCreate(filename=file.filename if file.filename else unique_filename)
    db_video = crud.create_video_for_project(db=db, video=video_data, project_id=project_id, filepath=file_path)
    
    crud.update_video_data(db=db, video_id=db_video.id, status="processing")
    print(f"Video ID {db_video.id} status set to processing.")

    background_tasks.add_task(transcription_service.transcribe_video_with_openai, file_path, db_video.id, database.SessionLocal)
    print(f"Background task added for video ID {db_video.id}")
    
    updated_db_video = crud.get_video(db=db, video_id=db_video.id)
    return updated_db_video if updated_db_video else db_video

@router.delete("/{project_id}/videos/{video_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_video_from_project_endpoint(
    project_id: int, 
    video_id: int,
    db: Session = Depends(database.get_db)
):
    db_video = crud.get_video(db, video_id=video_id)
    if not db_video:
        raise HTTPException(status_code=404, detail="Video not found")
    if db_video.project_id != project_id: 
        raise HTTPException(status_code=403, detail="Video does not belong to this project")
    
    deleted_video = crud.delete_video(db, video_id=video_id)
    if not deleted_video: 
        raise HTTPException(status_code=404, detail="Video not found during deletion attempt")
    
    print(f"Video ID {video_id} deleted from project ID {project_id}")
    return Response(status_code=http_status.HTTP_204_NO_CONTENT)