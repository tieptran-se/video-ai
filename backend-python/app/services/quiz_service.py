import os
import json
import asyncio
from .. import crud
from ..database import SessionLocal
from .openai_utils import generate_quiz_data_from_transcript # Import from openai_utils
from typing import Optional, List as PyList, Any, Dict


async def process_quiz_generation(video_id: int, video_title: str, db_session_factory):
    db = db_session_factory()
    default_error_quiz = {"title": f"Quiz for {video_title}", "questions": [{"question_text": "Quiz generation error.", "question_type": "single-choice", "options": [], "explanation": ""}]}
    try:
        video = crud.get_video(db, video_id=video_id)
        if not video:
            print(f"Video with ID {video_id} not found for quiz generation.")
            return
        if not video.transcript:
            print(f"Video with ID {video_id} has no transcript. Cannot generate quiz.")
            crud.update_video_data(db=db, video_id=video_id, quiz_data=json.dumps(default_error_quiz), status="completed")
            return
        
        try:
            transcript_data = json.loads(video.transcript)
            # Concatenate all segment texts to form the full transcript text
            full_text = " ".join([seg['text'] for seg in transcript_data.get("segments", []) if seg.get('text')])
        except json.JSONDecodeError:
            print(f"Could not parse transcript for video ID {video_id} to extract text for quiz.")
            crud.update_video_data(db=db, video_id=video_id, quiz_data=json.dumps(default_error_quiz), status="completed")
            return

        if not full_text.strip():
            print(f"Transcript text is empty for video ID {video_id}. Cannot generate quiz.")
            crud.update_video_data(db=db, video_id=video_id, quiz_data=json.dumps(default_error_quiz), status="completed")
            return

        quiz_json_data = await generate_quiz_data_from_transcript(full_text, video_title)
        crud.update_video_data(db=db, video_id=video_id, quiz_data=json.dumps(quiz_json_data), status="completed")
        print(f"Quiz generated and saved for video ID: {video_id}")

    except Exception as e:
        print(f"Error in process_quiz_generation for video ID {video_id}: {str(e)}")
        default_error_quiz["questions"][0]["question_text"] = f"Quiz generation error: {str(e)}"
        crud.update_video_data(db=db, video_id=video_id, quiz_data=json.dumps(default_error_quiz), status="completed")
    finally:
        db.close()