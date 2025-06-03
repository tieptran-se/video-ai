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

def update_video_status(db: Session, video_id: int, status: str, transcript: Optional[str] = None, summary: Optional[str] = None):
    db_video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if db_video:
        db_video.status = status
        if transcript: 
            db_video.transcript = transcript
        if summary:
            db_video.summary = summary
        db.commit()
        db.refresh(db_video)
    return db_video

def get_video(db: Session, video_id: int):
    return db.query(models.Video).filter(models.Video.id == video_id).first()