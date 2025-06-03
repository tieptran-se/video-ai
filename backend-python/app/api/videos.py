from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas, database 

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