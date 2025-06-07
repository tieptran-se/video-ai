import json
import asyncio
from .. import crud
from .openai_utils import answer_question_from_transcript
from typing import List, Dict

async def process_chat_request(slug: str, chat_request: Dict, db):
    """
    Handles the business logic for a chat request.
    """
    video = crud.get_video_by_public_slug(db, public_slug=slug)
    if not video:
        return {"answer": "Error: Video not found or is not public."}
    
    if not video.transcript:
        return {"answer": "Error: Transcript for this video is not available."}

    try:
        # Transcript is stored as a JSON string, need to extract the full text
        transcript_data = json.loads(video.transcript)
        full_text = " ".join([seg['text'] for seg in transcript_data.get("segments", []) if seg.get('text')])
    except (json.JSONDecodeError, TypeError):
        # Fallback if transcript is not a valid JSON object string
        full_text = video.transcript

    if not full_text.strip():
        return {"answer": "This video's transcript is empty, so I cannot answer questions about it."}
    
    answer = await answer_question_from_transcript(
        full_transcript_text=full_text,
        user_question=chat_request.get("question"),
        chat_history=chat_request.get("chat_history", [])
    )
    
    return {"answer": answer}