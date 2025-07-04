import { HttpClient, HttpErrorResponse, HttpEvent, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ChatRequest, ChatResponse, Project, PublicVideoData, Video } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class Api {
  private baseUrl = 'http://localhost:8000';
  constructor(private http: HttpClient) { }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      errorMessage = `Server Error (Code: ${error.status}): ${error.error?.detail || error.message}`;
    }
    console.error(error);
    return throwError(() => new Error(errorMessage));
  }

  createProject(projectName: string): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/projects/`, { name: projectName })
      .pipe(catchError(this.handleError));
  }

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/projects/`)
      .pipe(catchError(this.handleError));
  }

  getProject(projectId: number): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/projects/${projectId}`)
      .pipe(catchError(this.handleError));
  }

  getAllVideos(): Observable<Video[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/projects/`).pipe(
      map(projects => projects.flatMap(project => 
        (project.videos || []).map(video => ({...video, project_name: project.name})) 
      )),
      catchError(this.handleError)
    );
  }


  uploadVideo(projectId: number, file: File): Observable<HttpEvent<Video>> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const req = new HttpRequest('POST', `${this.baseUrl}/projects/${projectId}/upload_video/`, formData, {
      reportProgress: true,
    });
    return this.http.request<Video>(req);
  }

  getVideoStatus(videoId: number): Observable<Video> {
    return this.http.get<Video>(`${this.baseUrl}/videos/${videoId}`)
      .pipe(catchError(this.handleError));
  }

  generateMindmap(videoId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/videos/${videoId}/generate-mindmap`, {})
      .pipe(catchError(this.handleError));
  }

  generateQuiz(videoId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/videos/${videoId}/generate-quiz`, {})
      .pipe(catchError(this.handleError));
  }

  deleteVideo(projectId: number, videoId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/projects/${projectId}/videos/${videoId}`)
      .pipe(catchError(this.handleError));
  }

  updateVideoTags(videoId: number, tags: string[]): Observable<Video> {
    return this.http.put<Video>(`${this.baseUrl}/videos/${videoId}/tags`, { tags })
      .pipe(catchError(this.handleError));
  }

  publishVideo(videoId: number): Observable<Video> {
    return this.http.post<Video>(`${this.baseUrl}/videos/${videoId}/publish`, {})
      .pipe(catchError(this.handleError));
  }

  unpublishVideo(videoId: number): Observable<Video> {
    return this.http.post<Video>(`${this.baseUrl}/videos/${videoId}/unpublish`, {})
      .pipe(catchError(this.handleError));
  }

  getPublicVideoBySlug(slug: string): Observable<PublicVideoData> {
    return this.http.get<PublicVideoData>(`${this.baseUrl}/public/videos/${slug}`)
      .pipe(catchError(this.handleError));
  }

  chatWithVideo(slug: string, request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/public/videos/${slug}/chat`, request)
      .pipe(catchError(this.handleError));
  }
}
