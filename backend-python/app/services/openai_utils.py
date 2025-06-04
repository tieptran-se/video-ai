import os
import json
import asyncio
from openai import OpenAI
from typing import List as PyList, Any, Dict
from .utils import format_timestamp 

try:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    if not os.getenv("OPENAI_API_KEY"):
        print("Warning: OPENAI_API_KEY environment variable not set. OpenAI calls will fail.")
except Exception as e:
    print(f"Error initializing OpenAI client: {e}. OpenAI calls will fail.")
    client = None

async def extract_key_moments(full_transcript_text: str, whisper_segments_objects: PyList[Any]) -> PyList[Dict[str, str]]:
    key_moments_final: PyList[Dict[str, str]] = []
    if not client: return [] 
    if not full_transcript_text.strip(): return []

    try:
        estimated_duration_minutes = 0
        if whisper_segments_objects and hasattr(whisper_segments_objects[-1], 'end'):
            estimated_duration_minutes = whisper_segments_objects[-1].end / 60
        
        num_chapters_suggestion = "5-7"
        if estimated_duration_minutes > 20: num_chapters_suggestion = "7-10"
        elif estimated_duration_minutes < 5: num_chapters_suggestion = "3-5"

        extraction_prompt = f"""
        Analyze the following transcript and identify {num_chapters_suggestion} significant and distinct key moments or chapters that are well-distributed throughout the content.
        For each key moment:
        1. Provide a concise descriptive 'label' (5-10 words) that summarizes the section.
        2. Provide the 'starting_phrase' which is the first few words (approx. 10-20 words) of the sentence where this new section or topic begins in the transcript. 
           Ensure each 'starting_phrase' is unique and clearly marks the beginning of a different part of the discussion.
        Return the result *only* as a JSON object with a single key "key_moments", containing a list of objects, each with "label" and "starting_phrase".
        Ensure chronological order. Example: {{"key_moments": [{{"label": "Intro", "starting_phrase": "Welcome..."}}]}}
        If no distinct key moments are found, return {{"key_moments": []}}.
        Transcript: {full_transcript_text}"""

        chat_model_to_use = "gpt-3.5-turbo-0125" 
        response = await asyncio.to_thread(
            client.chat.completions.create, model=chat_model_to_use,
            messages=[
                {"role": "system", "content": "You identify key moments in transcripts, returning JSON: {\"key_moments\": [{\"label\": str, \"starting_phrase\": str}]}"},
                {"role": "user", "content": extraction_prompt}],
            temperature=0.3, response_format={"type": "json_object"} )

        raw_response_content = response.choices[0].message.content
        extracted_moments_data = []
        if raw_response_content:
            try:
                data = json.loads(raw_response_content)
                if isinstance(data, dict) and "key_moments" in data and isinstance(data["key_moments"], list):
                    extracted_moments_data = data["key_moments"]
            except Exception as e: print(f"Error processing key moments response: {e}")
        if not extracted_moments_data: return []

        last_found_timestamp_seconds = -1.0 
        for moment_info in extracted_moments_data:
            label = moment_info.get("label"); starting_phrase = moment_info.get("starting_phrase")
            if not all([label, starting_phrase, isinstance(label, str), isinstance(starting_phrase, str)]): continue
            found_timestamp_str = "00:00:00.000"; current_best_match_start_seconds = -1.0
            for seg_obj in whisper_segments_objects:
                segment_text = getattr(seg_obj, 'text', ""); segment_start_seconds = getattr(seg_obj, 'start', 0.0)
                if segment_start_seconds <= last_found_timestamp_seconds: continue
                if starting_phrase.lower() in segment_text.lower():
                    if current_best_match_start_seconds == -1.0 or segment_start_seconds < current_best_match_start_seconds:
                        if not any(km['timestamp_start'] == format_timestamp(segment_start_seconds) for km in key_moments_final):
                            current_best_match_start_seconds = segment_start_seconds
                            found_timestamp_str = format_timestamp(segment_start_seconds)
            if current_best_match_start_seconds > -1.0:
                key_moments_final.append({"label": label.strip(), "timestamp_start": found_timestamp_str})
                last_found_timestamp_seconds = current_best_match_start_seconds
        key_moments_final.sort(key=lambda x: x['timestamp_start'])
        final_unique_moments = []; seen_timestamps = set()
        for moment in key_moments_final:
            if moment['timestamp_start'] not in seen_timestamps:
                final_unique_moments.append(moment); seen_timestamps.add(moment['timestamp_start'])
        return final_unique_moments
    except Exception as e: print(f"Error in extract_key_moments: {str(e)}"); return []

async def generate_mindmap_data_from_transcript(full_transcript_text: str, key_moments: PyList[Dict[str,str]]) -> str:
    if not client: return "# Mind Map Error\n- Client not initialized."
    if not full_transcript_text.strip(): return "# Mind Map Error\n- Empty transcript."
    key_moments_summary = "\nKey moments:\n" + "\n".join([f"- {km['label']} ({km['timestamp_start']})" for km in key_moments]) if key_moments else ""
    mindmap_prompt = f"""Generate a hierarchical Markdown mind map from the transcript and key moments.
    Use # for main branches, nested lists for sub-topics. Aim for 2-4 levels.
    {key_moments_summary}\nTranscript: {full_transcript_text[:15000]}"""
    try:
        response = await asyncio.to_thread(
            client.chat.completions.create, model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You generate Markdown mind maps from transcripts."},
                {"role": "user", "content": mindmap_prompt}],
            temperature=0.5)
        return response.choices[0].message.content or "# Mind Map\n- No content."
    except Exception as e: return f"# Mind Map Error\n- {str(e)}"

async def generate_quiz_data_from_transcript(full_transcript_text: str, video_title: str) -> Dict[str, Any]:
    if not client: return {"title": f"Quiz for {video_title}", "questions": [{"question_text": "Quiz generation failed: OpenAI client not initialized.", "question_type": "single-choice", "options": [], "explanation": ""}]}
    if not full_transcript_text.strip(): return {"title": f"Quiz for {video_title}", "questions": [{"question_text": "Quiz generation failed: Transcript empty.", "question_type": "single-choice", "options": [], "explanation": ""}]}

    quiz_prompt = f"""
    Based on the following video transcript, generate a quiz with 15-20 questions to test understanding of the content.
    Include a mix of single-choice and multiple-choice questions.
    For each question, provide:
    - "question_text": The question itself.
    - "question_type": Either "single-choice" or "multiple-choice".
    - "options": A list of option objects, each with "text" and "is_correct" (boolean). For single-choice, only one option should be correct.
    - "explanation": (Optional) A brief explanation for the correct answer.

    Return the result *only* as a JSON object with a "title" (e.g., "Quiz for: [Video Title]") and a "questions" key, where "questions" is a list of question objects as described above.
    Example of the "questions" list structure:
    [
      {{
        "question_text": "What is the main topic of the first section?",
        "question_type": "single-choice",
        "options": [
          {{"text": "Option A", "is_correct": false}},
          {{"text": "Option B (Correct)", "is_correct": true}},
          {{"text": "Option C", "is_correct": false}}
        ],
        "explanation": "Option B is correct because..."
      }},
      {{
        "question_text": "Which of the following concepts were discussed? (Select all that apply)",
        "question_type": "multiple-choice",
        "options": [
          {{"text": "Concept X (Correct)", "is_correct": true}},
          {{"text": "Concept Y", "is_correct": false}},
          {{"text": "Concept Z (Correct)", "is_correct": true}}
        ],
        "explanation": "Concepts X and Z were mentioned..."
      }}
    ]
    If the transcript is too short or unsuitable for generating 15-20 questions, generate as many good questions as possible.

    Video Title: {video_title}
    Transcript:
    {full_transcript_text[:15000]} 
    """
    print("Requesting quiz generation from OpenAI chat model...")
    try:
        chat_model_to_use = "gpt-3.5-turbo-0125" # Good for JSON
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=chat_model_to_use,
            messages=[
                {"role": "system", "content": "You are an assistant that generates quizzes in a specific JSON format from video transcripts."},
                {"role": "user", "content": quiz_prompt}
            ],
            temperature=0.4,
            response_format={"type": "json_object"}
        )
        quiz_json_str = response.choices[0].message.content
        print("Quiz JSON generated.")
        # Validate and return the parsed JSON, or a default error structure
        if quiz_json_str:
            parsed_quiz = json.loads(quiz_json_str)
            if "title" in parsed_quiz and "questions" in parsed_quiz:
                return parsed_quiz
        return {"title": f"Quiz for {video_title}", "questions": [{"question_text": "Failed to parse quiz data from LLM.", "question_type": "single-choice", "options": [], "explanation": ""}]}

    except Exception as e:
        print(f"Error during quiz generation with OpenAI: {str(e)}")
        return {"title": f"Quiz for {video_title}", "questions": [{"question_text": f"Quiz generation error: {str(e)}", "question_type": "single-choice", "options": [], "explanation": ""}]}
