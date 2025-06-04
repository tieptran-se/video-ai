from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any, Union, Literal # PyList was used here, changed to List
from datetime import datetime

class VideoBase(BaseModel):
    filename: str

class VideoCreate(VideoBase):
    pass

# Schemas for Quiz Data
class QuizQuestionOption(BaseModel):
    text: str
    is_correct: bool 

class QuizQuestion(BaseModel):
    question_text: str
    question_type: Literal["single-choice", "multiple-choice"]
    options: List[QuizQuestionOption] # Changed PyList to List
    explanation: Optional[str] = None 

class Quiz(BaseModel):
    title: str
    questions: List[QuizQuestion] # Changed PyList to List


class VideoSchema(VideoBase):
    id: int
    project_id: int
    filepath: str
    status: str
    transcript: Optional[Any] 
    summary: Optional[str]
    mindmap_data: Optional[str] 
    quiz_data: Optional[Any] 
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProjectBase(BaseModel):
    name: str

class ProjectCreate(ProjectBase):
    pass

class ProjectSchema(ProjectBase):
    id: int
    created_at: datetime
    videos: List[VideoSchema] = []

    model_config = ConfigDict(from_attributes=True)