import os
import json
import asyncio
from .. import crud
from ..database import SessionLocal
from .openai_utils import generate_quiz_data_from_transcript 
from typing import Optional, List as PyList, Any, Dict


async def process_quiz_generation(video_id: int, video_title: str, db_session_factory):
    db = db_session_factory()
    print(f"[QuizService] Video ID {video_id}: Starting quiz generation process for '{video_title}'.")
    default_error_quiz = {"title": f"Quiz for {video_title}", "questions": [{"question_text": "Quiz generation error.", "question_type": "single-choice", "options": [], "explanation": ""}]}
    try:
        video = crud.get_video(db, video_id=video_id)
        if not video: 
            print(f"[QuizService] Video ID {video_id}: Not found."); return
        if not video.transcript:
            print(f"[QuizService] Video ID {video_id}: No transcript available.")
            crud.update_video_data(db=db, video_id=video_id, quiz_data=json.dumps(default_error_quiz), status="completed")
            return
        
        try:
            transcript_data = json.loads(video.transcript)
            full_text = " ".join([seg['text'] for seg in transcript_data.get("segments", []) if seg.get('text')])
        except json.JSONDecodeError:
            print(f"[QuizService] Video ID {video_id}: Could not parse transcript.")
            crud.update_video_data(db=db, video_id=video_id, quiz_data=json.dumps(default_error_quiz), status="completed")
            return

        if not full_text.strip():
            print(f"[QuizService] Video ID {video_id}: Transcript text empty.")
            crud.update_video_data(db=db, video_id=video_id, quiz_data=json.dumps(default_error_quiz), status="completed")
            return

        quiz_json_data = await generate_quiz_data_from_transcript(full_text, video_title)
        print(f"[QuizService] Video ID {video_id}: Quiz generated, updating status to 'completed'.")
        crud.update_video_data(db=db, video_id=video_id, quiz_data=json.dumps(quiz_json_data), status="completed")
        print(f"[QuizService] Video ID {video_id}: Quiz saved.")

    except Exception as e:
        print(f"[QuizService] Video ID {video_id}: Error in process_quiz_generation: {str(e)}")
        default_error_quiz["questions"][0]["question_text"] = f"Quiz generation error: {str(e)}"
        crud.update_video_data(db=db, video_id=video_id, quiz_data=json.dumps(default_error_quiz), status="completed")
    finally:
        print(f"[QuizService] Video ID {video_id}: Quiz task finished, closing DB session.")
        db.close()