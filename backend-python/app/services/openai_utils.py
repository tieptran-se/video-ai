import os
import json
import asyncio
from openai import OpenAI
from typing import List as PyList, Any, Dict 
from .utils import format_timestamp 
from .prompt_manager import ( # Import prompts from prompt_manager
    get_key_moments_extraction_prompt,
    get_mindmap_generation_prompt,
    get_quiz_generation_prompt,
    get_tag_generation_prompt,
    get_chat_prompt
)

try:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"), timeout=60.0) 
    if not os.getenv("OPENAI_API_KEY"):
        print("Warning: OPENAI_API_KEY environment variable not set. OpenAI calls will fail.")
except Exception as e:
    print(f"Error initializing OpenAI client: {e}. OpenAI calls will fail.")
    client = None

async def extract_key_moments(full_transcript_text: str, whisper_segments_objects: PyList[Any]) -> PyList[Dict[str, str]]:
    key_moments_final: PyList[Dict[str, str]] = []
    if not client: return [] 
    if not full_transcript_text.strip(): return []
    print("[OpenAI_Utils] Starting key moment extraction...")
    try:
        estimated_duration_minutes = 0
        if whisper_segments_objects and hasattr(whisper_segments_objects[-1], 'end'):
            estimated_duration_minutes = whisper_segments_objects[-1].end / 60
        
        num_chapters_suggestion = "5-7"
        if estimated_duration_minutes > 20: num_chapters_suggestion = "7-10"
        elif estimated_duration_minutes < 5: num_chapters_suggestion = "3-5"

        extraction_prompt = get_key_moments_extraction_prompt(full_transcript_text, num_chapters_suggestion)

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
            except Exception as e: print(f"[OpenAI_Utils] Error processing key moments response: {e}")
        if not extracted_moments_data: 
            print("[OpenAI_Utils] No key moments extracted by LLM or parsing failed.")
            return []

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
        print(f"[OpenAI_Utils] Key moment extraction successful. Found {len(final_unique_moments)} moments.")
        return final_unique_moments
    except Exception as e: print(f"[OpenAI_Utils] Error in extract_key_moments: {str(e)}"); return []

async def generate_mindmap_data_from_transcript(full_transcript_text: str, key_moments: PyList[Dict[str,str]]) -> str:
    if not client: return "# Mind Map Error\n- Client not initialized."
    if not full_transcript_text.strip(): return "# Mind Map Error\n- Empty transcript."
    print("[OpenAI_Utils] Starting mind map generation...")
    key_moments_summary = "\nKey moments:\n" + "\n".join([f"- {km['label']} ({km['timestamp_start']})" for km in key_moments]) if key_moments else ""
    
    mindmap_prompt = get_mindmap_generation_prompt(full_transcript_text, key_moments_summary)
    
    try:
        response = await asyncio.to_thread(
            client.chat.completions.create, model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You generate Markdown mind maps from transcripts."},
                {"role": "user", "content": mindmap_prompt}],
            temperature=0.5)
        print("[OpenAI_Utils] Mind map Markdown generated by LLM.")
        return response.choices[0].message.content or "# Mind Map\n- No content."
    except Exception as e: print(f"[OpenAI_Utils] Error in generate_mindmap: {str(e)}"); return f"# Mind Map Error\n- {str(e)}"

async def generate_quiz_data_from_transcript(full_transcript_text: str, video_title: str) -> Dict[str, Any]:
    if not client: return {"title": f"Quiz for {video_title}", "questions": [{"question_text": "Quiz generation failed: OpenAI client not initialized.", "question_type": "single-choice", "options": [], "explanation": ""}]}
    if not full_transcript_text.strip(): return {"title": f"Quiz for {video_title}", "questions": [{"question_text": "Quiz generation failed: Transcript empty.", "question_type": "single-choice", "options": [], "explanation": ""}]}
    print("[OpenAI_Utils] Starting quiz generation...")
    
    quiz_prompt = get_quiz_generation_prompt(full_transcript_text, video_title)
    
    try:
        chat_model_to_use = "gpt-3.5-turbo-0125" 
        response = await asyncio.to_thread(
            client.chat.completions.create, model=chat_model_to_use,
            messages=[
                {"role": "system", "content": "You are an assistant that generates quizzes in a specific JSON format from video transcripts."},
                {"role": "user", "content": quiz_prompt}],
            temperature=0.4, response_format={"type": "json_object"})
        quiz_json_str = response.choices[0].message.content
        print("[OpenAI_Utils] Quiz JSON generated by LLM.")
        if quiz_json_str:
            parsed_quiz = json.loads(quiz_json_str)
            if "title" in parsed_quiz and "questions" in parsed_quiz: return parsed_quiz
        return {"title": f"Quiz for {video_title}", "questions": [{"question_text": "Failed to parse quiz data from LLM.", "question_type": "single-choice", "options": [], "explanation": ""}]}
    except Exception as e:
        print(f"[OpenAI_Utils] Error in generate_quiz: {str(e)}")
        return {"title": f"Quiz for {video_title}", "questions": [{"question_text": f"Quiz generation error: {str(e)}", "question_type": "single-choice", "options": [], "explanation": ""}]}

async def generate_tags_from_transcript(full_transcript_text: str) -> PyList[str]:
    if not client:
        print("[OpenAI_Utils] OpenAI client not initialized. Cannot generate tags.")
        return []
    if not full_transcript_text.strip():
        print("[OpenAI_Utils] Transcript text is empty. Cannot generate tags.")
        return []

    tagging_prompt = get_tag_generation_prompt(full_transcript_text)

    print("[OpenAI_Utils] Requesting tag generation from OpenAI chat model...")
    try:
        chat_model_to_use = "gpt-3.5-turbo-0125" 
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=chat_model_to_use,
            messages=[
                {"role": "system", "content": "You are an assistant that suggests relevant tags (categories, keywords) for a video transcript. You return a JSON object with a 'tags' key, which is a list of strings."},
                {"role": "user", "content": tagging_prompt}
            ],
            temperature=0.3, 
            response_format={"type": "json_object"}
        )
        tags_json_str = response.choices[0].message.content
        print(f"[OpenAI_Utils] Raw tags JSON object string: {tags_json_str}")
        
        extracted_tags_list = []
        if tags_json_str:
            try:
                data = json.loads(tags_json_str)
                if isinstance(data, dict) and "tags" in data and isinstance(data["tags"], list):
                    extracted_tags_list = [str(tag).strip() for tag in data["tags"] if isinstance(tag, str) and tag.strip()] 
                    extracted_tags_list = list(dict.fromkeys(extracted_tags_list))
            except json.JSONDecodeError as json_e:
                print(f"[OpenAI_Utils] Error decoding JSON from tags response: {json_e}")
            except Exception as e:
                print(f"[OpenAI_Utils] An unexpected error occurred while processing tags response: {e}")
        
        if not extracted_tags_list:
            print("[OpenAI_Utils] No tags were extracted or the response was not in the expected format.")
            return []
        
        print(f"[OpenAI_Utils] Tag generation successful. Found {len(extracted_tags_list)} tags: {extracted_tags_list}")
        return extracted_tags_list

    except Exception as e:
        print(f"[OpenAI_Utils] Error during tag generation with OpenAI: {str(e)}")
        return []
    
async def answer_question_from_transcript(full_transcript_text: str, user_question: str, chat_history: PyList[Dict[str,str]]) -> str:
    if not client or not full_transcript_text.strip(): return "Error: Cannot answer question as the video transcript is empty."
    print(f"[OpenAI_Utils] Answering question: '{user_question}'")
    prompt = get_chat_prompt(full_transcript_text, user_question)
    messages_for_api = []
    # for message in chat_history:
    #     messages_for_api.append({"role": message["role"], "content": message["content"]})
    messages_for_api.append({"role": "user", "content": prompt})
    try:
        response = await asyncio.to_thread(client.chat.completions.create, model="gpt-4o-mini", messages=messages_for_api, temperature=0.2)
        answer = response.choices[0].message.content
        return answer or "I'm sorry, I could not generate a response."
    except Exception as e:
        print(f"[OpenAI_Utils] Error during chat completion: {e}")
        return "An error occurred while answering the question."