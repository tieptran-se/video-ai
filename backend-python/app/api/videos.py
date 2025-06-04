from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status as http_status
from sqlalchemy.orm import Session
from typing import Optional 


from .. import crud, schemas, database, models
from ..services import mindmap_service, quiz_service # Updated imports

router = APIRouter(
    prefix="/videos",
    tags=["videos"],
)

@router.get("/{video_id}/status", response_model=schemas.VideoSchema)
def get_video_status_endpoint(video_id: int, db: Session = Depends(database.get_db)):
    db_video = crud.get_video(db, video_id=video_id)
    if not db_video:
        raise HTTPException(status_code=404, detail="Video not found")
    return db_video

@router.post("/{video_id}/generate-mindmap", status_code=http_status.HTTP_202_ACCEPTED)
async def generate_mindmap_endpoint(
    video_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db)
):
    db_video = crud.get_video(db, video_id=video_id)
    if not db_video:
        raise HTTPException(status_code=404, detail="Video not found")
    if not db_video.transcript or (db_video.status != "completed" and db_video.status != "generating_mindmap"):
        raise HTTPException(status_code=400, detail="Video transcript not available or video not fully processed for transcript.")

    crud.update_video_data(db=db, video_id=video_id, status="generating_mindmap", mindmap_data=None) 
    print(f"Video ID {video_id} status set to generating_mindmap.")

    background_tasks.add_task(mindmap_service.process_mindmap_generation, video_id, database.SessionLocal)
    return {"message": "Mind map generation started in the background."}

@router.post("/{video_id}/generate-quiz", status_code=http_status.HTTP_202_ACCEPTED)
async def generate_quiz_endpoint(
    video_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db)
):
    db_video = crud.get_video(db, video_id=video_id)
    if not db_video:
        raise HTTPException(status_code=404, detail="Video not found")
    if not db_video.transcript or (db_video.status != "completed" and db_video.status != "generating_quiz"): # Add generating_quiz status
        raise HTTPException(status_code=400, detail="Video transcript not available or video not fully processed for transcript.")

    # Optionally update status to 'generating_quiz'
    crud.update_video_data(db=db, video_id=video_id, status="generating_quiz", quiz_data=None) # Clear old quiz data
    print(f"Video ID {video_id} status set to generating_quiz.")

    background_tasks.add_task(quiz_service.process_quiz_generation, video_id, db_video.filename, database.SessionLocal)
    return {"message": "Quiz generation started in the background."}
