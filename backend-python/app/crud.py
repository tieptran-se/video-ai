from sqlalchemy.orm import Session
from typing import Optional, List as PyList 
from . import models, schemas 
import json, uuid, os 

def get_project_by_name(db: Session, name: str): return db.query(models.Project).filter(models.Project.name == name).first()
def create_project(db: Session, project: schemas.ProjectCreate):
    db_project = models.Project(name=project.name); db.add(db_project); db.commit(); db.refresh(db_project); return db_project
def get_project(db: Session, project_id: int): return db.query(models.Project).filter(models.Project.id == project_id).first()
def get_projects(db: Session, skip: int = 0, limit: int = 100): return db.query(models.Project).offset(skip).limit(limit).all()
def create_video_for_project(db: Session, video: schemas.VideoCreate, project_id: int, filepath: str):
    db_video = models.Video(filename=video.filename, project_id=project_id, filepath=filepath, status="uploaded", tags=[]); db.add(db_video); db.commit(); db.refresh(db_video); return db_video
def update_video_data(db: Session, video_id: int, status: Optional[str]=None, transcript: Optional[str]=None, summary: Optional[str]=None, mindmap_data: Optional[str]=None, quiz_data: Optional[str]=None, tags: Optional[PyList[str]]=None, is_public: Optional[bool]=None, public_slug: Optional[str]=None):
    db_video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if db_video:
        if status is not None: db_video.status = status
        if transcript is not None: db_video.transcript = transcript
        if summary is not None: db_video.summary = summary
        if mindmap_data is not None: db_video.mindmap_data = mindmap_data
        if quiz_data is not None: db_video.quiz_data = quiz_data
        if tags is not None: db_video.tags = tags
        if is_public is not None:
            db_video.is_public = is_public
            if is_public and not db_video.public_slug: db_video.public_slug = str(uuid.uuid4())
            elif not is_public: db_video.public_slug = None
        if public_slug is not None: db_video.public_slug = public_slug
        try: db.commit(); db.refresh(db_video)
        except Exception as e: print(f"[DB_UPDATE_ERROR] Video ID {video_id}: {e}"); db.rollback()
    return db_video
def get_video(db: Session, video_id: int) -> Optional[models.Video]: return db.query(models.Video).filter(models.Video.id == video_id).first()
def get_video_by_public_slug(db: Session, public_slug: str) -> Optional[models.Video]: return db.query(models.Video).filter(models.Video.public_slug == public_slug, models.Video.is_public == True).first()
def delete_video(db: Session, video_id: int) -> Optional[models.Video]:
    db_video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if db_video:
        video_filepath_to_delete = db_video.filepath 
        if video_filepath_to_delete and os.path.exists(video_filepath_to_delete):
            try:
                os.remove(video_filepath_to_delete)
                base_filename = os.path.splitext(os.path.basename(video_filepath_to_delete))[0]
                audio_file_path = os.path.join(os.path.dirname(video_filepath_to_delete), f"{base_filename}.mp3")
                if os.path.exists(audio_file_path): os.remove(audio_file_path)
            except Exception as e: print(f"Error deleting video/audio file {video_filepath_to_delete}: {e}")
        db.delete(db_video); db.commit()
        return db_video 
    return None