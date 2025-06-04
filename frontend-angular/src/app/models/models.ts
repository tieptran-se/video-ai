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
  status?: 'uploaded' | 'processing' | 'completed' | 'failed' | 'generating_mindmap' | 'generating_quiz'; // Added generating_quiz
  transcript?: string | VideoTranscript; 
  summary?: string;
  mindmap_data?: string | null;
  quiz_data?: string | QuizData | null; // Can be string (JSON), parsed object, or null
  uploaded_at?: string;
}