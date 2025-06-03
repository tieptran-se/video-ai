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

export interface VideoTranscript {
  segments: TranscriptSegment[];
  key_moments: KeyMoment[];
}

export interface Video {
  id?: number;
  project_id?: number;
  filename: string;
  filepath?: string;
  status?: 'uploaded' | 'processing' | 'completed' | 'failed';
  transcript?: string | VideoTranscript; 
  summary?: string;
  uploaded_at?: string;
}