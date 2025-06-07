export interface Project {
  id?: number;
  name: string;
  created_at?: string;
  videos?: Video[];
}

export interface TranscriptSegment {
  timestamp_start: string;
  timestamp_end: string;
  text: string;
  timestamp_start_seconds?: number;
  timestamp_end_seconds?: number;
}

export interface KeyMoment {
  label: string;
  timestamp_start: string;
  timestamp_start_seconds?: number;
}

export interface QuizQuestionOption {
  text: string;
  is_correct: boolean;
}

export interface QuizQuestion {
  question_text: string;
  question_type: "single-choice" | "multiple-choice";
  options: QuizQuestionOption[];
  explanation?: string;
}

export interface QuizData {
  title: string;
  questions: QuizQuestion[];
}

export interface VideoTranscript {
  segments: TranscriptSegment[];
  key_moments: KeyMoment[];
}

export interface Video {
  id?: number;
  project_id?: number;
  filename: string;
  filepath?: string;
  status?: 'uploaded' | 'processing' | 'completed' | 'failed' | 'generating_mindmap' | 'generating_quiz';
  transcript?: string | VideoTranscript | null; 
  summary?: string;
  mindmap_data?: string | null;
  quiz_data?: string | QuizData | null;
  tags?: string[];
  is_public?: boolean;
  public_slug?: string | null;
  uploaded_at?: string;
}

// Schema for public video view
export interface PublicVideoData extends Omit<Video, 'project_id' | 'status' | 'is_public' | 'public_slug' | 'transcript' | 'quiz_data'> {
 project_name: string;
 transcript?: VideoTranscript | null; 
 quiz_data?: QuizData | null; 
}

export interface ChatRequest {
  question: string;
  chat_history?: { role: string; content: string }[];
}

export interface ChatResponse {
  answer: string;
}
