from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response, status as http_status
from sqlalchemy.orm import Session
from typing import Optional, List 
from .. import crud, schemas, database, models
from ..services import mindmap_service, quiz_service, transcription_service
import uuid

router = APIRouter(prefix="/videos", tags=["videos"])

@router.get("/{video_id}", response_model=schemas.VideoSchema)
def get_video_endpoint(video_id: int, db: Session = Depends(database.get_db)):
    db_video = crud.get_video(db, video_id=video_id)
    if not db_video: raise HTTPException(status_code=404, detail="Video not found")
    return db_video

@router.delete("/{video_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_video_endpoint(video_id: int, db: Session = Depends(database.get_db)):
    deleted_video = crud.delete_video(db, video_id=video_id)
    if not deleted_video: raise HTTPException(status_code=404, detail="Video not found")
    return Response(status_code=http_status.HTTP_204_NO_CONTENT)

@router.post("/{video_id}/generate-mindmap", status_code=http_status.HTTP_202_ACCEPTED)
async def generate_mindmap_endpoint(video_id: int, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    db_video = crud.get_video(db, video_id=video_id)
    if not db_video or db_video.status != "completed":
        raise HTTPException(status_code=400, detail="Video transcript not available or video not fully processed.")
    crud.update_video_data(db=db, video_id=video_id, status="generating_mindmap", mindmap_data=None) 
    background_tasks.add_task(mindmap_service.process_mindmap_generation, video_id, database.SessionLocal)
    return {"message": "Mind map generation started."}

@router.post("/{video_id}/generate-quiz", status_code=http_status.HTTP_202_ACCEPTED)
async def generate_quiz_endpoint(video_id: int, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    db_video = crud.get_video(db, video_id=video_id)
    if not db_video or db_video.status != "completed":
        raise HTTPException(status_code=400, detail="Video transcript not available or video not fully processed.")
    crud.update_video_data(db=db, video_id=video_id, status="generating_quiz", quiz_data=None) 
    background_tasks.add_task(quiz_service.process_quiz_generation, video_id, db_video.filename, database.SessionLocal)
    return {"message": "Quiz generation started."}

@router.put("/{video_id}/tags", response_model=schemas.VideoSchema)
def update_video_tags_endpoint(video_id: int, tags_update: schemas.VideoTagUpdate, db: Session = Depends(database.get_db)):
    updated_video = crud.update_video_data(db=db, video_id=video_id, tags=tags_update.tags)
    if not updated_video: raise HTTPException(status_code=404, detail="Video not found")
    return updated_video

@router.post("/{video_id}/publish", response_model=schemas.VideoSchema)
def publish_video_endpoint(video_id: int, db: Session = Depends(database.get_db)):
    db_video = crud.get_video(db, video_id=video_id)
    if not db_video or db_video.status != "completed":
        raise HTTPException(status_code=400, detail="Video must be processed to be published.")
    slug = db_video.public_slug or str(uuid.uuid4())
    updated_video = crud.update_video_data(db=db, video_id=video_id, is_public=True, public_slug=slug)
    if not updated_video: raise HTTPException(status_code=500, detail="Failed to publish video")
    return updated_video

@router.post("/{video_id}/unpublish", response_model=schemas.VideoSchema)
def unpublish_video_endpoint(video_id: int, db: Session = Depends(database.get_db)):
    updated_video = crud.update_video_data(db=db, video_id=video_id, is_public=False)
    if not updated_video: raise HTTPException(status_code=404, detail="Video not found")
    return updated_video