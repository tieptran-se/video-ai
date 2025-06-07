def get_key_moments_extraction_prompt(full_transcript_text: str, num_chapters_suggestion: str) -> str:
    """
    Returns the prompt for extracting key moments/chapters from a transcript.
    """
    return f"""
    Analyze the following transcript and identify {num_chapters_suggestion} significant and distinct key moments or chapters that are well-distributed throughout the content.
    For each key moment:
    1. Provide a concise descriptive 'label' (5-10 words) that summarizes the section.
    2. Provide the 'starting_phrase' which is the first few words (approx. 10-20 words) of the sentence where this new section or topic begins in the transcript. 
       Ensure each 'starting_phrase' is unique and clearly marks the beginning of a different part of the discussion.

    Return the result *only* as a JSON object with a single key "key_moments", containing a list of objects, each with "label" and "starting_phrase".
    The list of key_moments should ideally be in chronological order based on their appearance in the transcript.
    Example: 
    {{
      "key_moments": [
        {{"label": "Introduction", "starting_phrase": "Welcome everyone to today's session where we will..."}},
        {{"label": "Core Feature X", "starting_phrase": "Now, let's dive into the core feature X..."}},
        {{"label": "User Benefits", "starting_phrase": "The primary benefit for users here is..."}}
      ]
    }}
    If no distinct key moments can be found, or if the transcript is too short, return an empty list for "key_moments": 
    {{"key_moments": []}}

    Transcript:
    {full_transcript_text}
    """

def get_mindmap_generation_prompt(full_transcript_text: str, key_moments_summary: str) -> str:
    """
    Returns the prompt for generating a mind map from a transcript and key moments.
    """
    return f"""
    Based on the following video transcript and its key moments, generate a hierarchical mind map in Markdown format.
    The mind map should represent the main ideas, sub-topics, and their relationships.
    Use Markdown headings for the main branches (e.g., # Main Idea) and nested lists for sub-topics.
    Aim for 2-4 levels of depth. Ensure the structure is clear and logical.
    
    {key_moments_summary}

    Full Transcript:
    {full_transcript_text[:15000]} 
    """ # Limiting transcript length for token limits

def get_quiz_generation_prompt(full_transcript_text: str, video_title: str) -> str:
    """
    Returns the prompt for generating a quiz from a transcript.
    """
    return f"""
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
      {{"question_text": "Q1?", "question_type": "single-choice", "options": [{{"text": "A", "is_correct": false}}, {{"text": "B", "is_correct": true}}], "explanation": "B is correct because..."}},
      {{"question_text": "Q2? (Select all)", "question_type": "multiple-choice", "options": [{{"text": "X", "is_correct": true}}, {{"text": "Y", "is_correct": false}}, {{"text": "Z", "is_correct": true}}], "explanation": "X and Z..."}}
    ]
    If the transcript is too short or unsuitable for 15-20 questions, generate as many good questions as possible.

    Video Title: {video_title}
    Transcript:
    {full_transcript_text[:15000]} 
    """

def get_tag_generation_prompt(full_transcript_text: str) -> str:
    """
    Returns the prompt for generating tags from a transcript.
    """
    return f"""
    Based on the following video transcript, suggest 5-10 relevant tags or categories.
    Each tag should be a single word or a short 2-3 word phrase.
    Focus on the main subjects, themes, and key terms discussed.
    Return the result *only* as a JSON object with a single key "tags" which is a list of these tag strings.
    Example: {{"tags": ["Artificial Intelligence", "Machine Learning", "Python", "Data Science"]}}
    If no relevant tags can be found, return an empty list for the "tags" key: {{"tags": []}}

    Transcript:
    {full_transcript_text[:10000]} 
    """

def get_chat_prompt(transcript_context: str, user_question: str) -> str:
    """
    Returns the prompt for answering a user's question based on a transcript.
    """
    return f"""
    You are a helpful assistant who answers questions based *only* on the provided video transcript.
    The user is asking a question about the video. Use the following transcript to answer it.
    If the answer cannot be found in the transcript, respond with "I'm sorry, I cannot answer that question based on the provided transcript."
    Do not use any outside knowledge.

    ---
    TRANSCRIPT CONTEXT:
    {transcript_context}
    ---

    USER QUESTION:
    {user_question}
    """