from sqlalchemy.orm import Session
from typing import Optional 
from . import models, schemas 
import json

def get_project_by_name(db: Session, name: str):
    return db.query(models.Project).filter(models.Project.name == name).first()

def create_project(db: Session, project: schemas.ProjectCreate):
    db_project = models.Project(name=project.name)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def get_projects(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Project).offset(skip).limit(limit).all()

def create_video_for_project(db: Session, video: schemas.VideoCreate, project_id: int, filepath: str):
    db_video = models.Video(filename=video.filename, project_id=project_id, filepath=filepath, status="uploaded")
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    return db_video

def update_video_data(
    db: Session, 
    video_id: int, 
    status: Optional[str] = None, 
    transcript: Optional[str] = None, 
    summary: Optional[str] = None,
    mindmap_data: Optional[str] = None,
    quiz_data: Optional[str] = None # Added quiz_data
):
    db_video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if db_video:
        if status is not None:
            db_video.status = status
        if transcript is not None: 
            db_video.transcript = transcript
        if summary is not None:
            db_video.summary = summary
        if mindmap_data is not None: 
            db_video.mindmap_data = mindmap_data
        if quiz_data is not None: # Added quiz_data update
            db_video.quiz_data = quiz_data
        db.commit()
        db.refresh(db_video)
    return db_video

def get_video(db: Session, video_id: int):
    return db.query(models.Video).filter(models.Video.id == video_id).first()

def delete_video(db: Session, video_id: int) -> Optional[models.Video]:
    db_video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if db_video:
        # Optional: Delete the actual file from the filesystem here
        # if os.path.exists(db_video.filepath):
        #     try:
        #         os.remove(db_video.filepath)
        #         print(f"Deleted video file: {db_video.filepath}")
        #     except Exception as e:
        #         print(f"Error deleting video file {db_video.filepath}: {e}")
        
        db.delete(db_video)
        db.commit()
        return db_video
    return None