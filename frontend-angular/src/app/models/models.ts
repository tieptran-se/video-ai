export interface Project {
  id?: number;
  name: string;
  created_at?: string;
  videos?: Video[];
}

export interface Video {
  id?: number;
  project_id?: number;
  filename: string;
  filepath?: string;
  status?: 'uploaded' | 'processing' | 'completed' | 'failed';
  transcript?: TranscriptSegment[] | string;
  summary?: string;
  uploaded_at?: string;
}

export interface TranscriptSegment {
  timestamp_start: string;
  timestamp_end: string;
  text: string;
}
