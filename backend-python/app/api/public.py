from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, schemas, database
from ..services import chat_service
import json 

router = APIRouter(
    prefix="/public/videos", 
    tags=["public_videos"],
)

@router.get("/{public_slug}", response_model=schemas.PublicVideoSchema)
def read_public_video_endpoint(public_slug: str, db: Session = Depends(database.get_db)):
    db_video = crud.get_video_by_public_slug(db, public_slug=public_slug)
    if not db_video:
        raise HTTPException(status_code=404, detail="Public video not found or not available")
    
    parsed_transcript = None
    if db_video.transcript:
        try:
            parsed_transcript = json.loads(db_video.transcript)
        except json.JSONDecodeError:
            print(f"Error decoding transcript JSON for public video slug {public_slug}")
            parsed_transcript = {"segments": [], "key_moments": [{"label":"Error parsing transcript", "timestamp_start": "00:00:00.000"}]}


    parsed_quiz_data = None
    if db_video.quiz_data:
        try:
            parsed_quiz_data = json.loads(db_video.quiz_data)
        except json.JSONDecodeError:
            print(f"Error decoding quiz_data JSON for public video slug {public_slug}")
            parsed_quiz_data = {"title": "Error", "questions": []}
            
    return schemas.PublicVideoSchema(
        filename=db_video.filename,
        filepath=db_video.filepath, 
        transcript=parsed_transcript,
        mindmap_data=db_video.mindmap_data,
        quiz_data=parsed_quiz_data,
        tags=db_video.tags if db_video.tags else [], 
        project_name=db_video.project.name if db_video.project else "Unknown Project"
    )


@router.post("/{public_slug}/chat", response_model=schemas.ChatResponse)
async def chat_with_video_endpoint(
    public_slug: str,
    chat_request: schemas.ChatRequest,
    db: Session = Depends(database.get_db)
):
    print(f"API: Received chat request for slug '{public_slug}' with question: '{chat_request.question}'")
    response_data = await chat_service.process_chat_request(public_slug, chat_request.model_dump(), db)
    if "Error:" in response_data["answer"]:
        # You might want to handle different error types with different status codes
        raise HTTPException(status_code=404, detail=response_data["answer"])
    return response_data
