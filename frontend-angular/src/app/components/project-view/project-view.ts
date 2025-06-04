import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subscription, Subject, timer, switchMap, takeWhile, finalize } from 'rxjs';
import { Project, QuizData, Video, VideoTranscript } from '../../models/models';
import { Api } from '../../services/api';
import { TranscriptDisplay } from '../transcript-display/transcript-display';
import { VideoUpload } from '../video-upload/video-upload';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MindmapDialog } from '../mindmap-dialog/mindmap-dialog';
import { MatMenuModule } from '@angular/material/menu';
import { QuizDialog } from '../quiz-dialog/quiz-dialog';

@Component({
  selector: 'app-project-view',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    JsonPipe,
    VideoUpload,
    TranscriptDisplay,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatDividerModule,
    MatRippleModule,
    MatTooltipModule,
    MatMenuModule
  ],
  templateUrl: './project-view.html',
  styleUrl: './project-view.scss'
})
export class ProjectView implements OnInit, OnDestroy {
  @Input() id?: string;
  project: Project | null = null;
  isLoadingProject: boolean = true;
  errorMessage: string | null = null;
  currentVideoForTranscript: Video | null = null;
  parsedTranscript: VideoTranscript | null = null;
  parsedQuizData: QuizData | null = null; // To hold parsed quiz data
  isPollingVideo: boolean = false;
  isGeneratingMindmap: boolean = false;
  isGeneratingQuiz: boolean = false; // New state for quiz generation

  private pollingSub?: Subscription;
  private ngUnsubscribe = new Subject<void>();

  constructor(
    private router: Router,
    private apiService: Api,
    private snackBar: MatSnackBar,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (this.id && !isNaN(+this.id)) {
      this.loadProjectData(+this.id);
    } else {
      this.snackBar.open('Invalid Project ID in route.', 'Close');
      this.router.navigate(['/projects']);
      this.isLoadingProject = false;
    }
  }

  loadProjectData(projectId: number): void {
    this.isLoadingProject = true;
    this.errorMessage = null;
    this.apiService.getProject(projectId).subscribe({
        next: (data) => {
            if (data) {
                this.project = data;
                this.determineInitialVideoForTranscript();
            } else {
                this.errorMessage = "Project not found.";
                this.snackBar.open(this.errorMessage, 'Close');
            }
            this.isLoadingProject = false;
        },
        error: (err) => {
            this.errorMessage = err.message;
            this.snackBar.open(`Error loading project: ${this.errorMessage}`, 'Close', { panelClass: 'snackbar-error' });
            this.isLoadingProject = false;
            console.error(err);
        }
    });
  }

  private parseVideoData(video: Video | null): void {
    this.parseVideoTranscript(video);
    this.parseQuizData(video);
  }

  private parseVideoTranscript(video: Video | null): void {
    if (video && video.transcript && typeof video.transcript === 'string') {
      try {
        const parsedData = JSON.parse(video.transcript);
        if (parsedData && Array.isArray(parsedData.segments) && Array.isArray(parsedData.key_moments)) {
            this.parsedTranscript = parsedData as VideoTranscript;
        } else {
            this.parsedTranscript = { segments: [], key_moments: [] };
        }
      } catch (e) {
        this.parsedTranscript = { segments: [], key_moments: [] };
      }
    } else if (video && typeof video.transcript === 'object' && video.transcript !== null) {
        const transcriptObj = video.transcript as VideoTranscript;
        if (transcriptObj && Array.isArray(transcriptObj.segments) && Array.isArray(transcriptObj.key_moments)) {
            this.parsedTranscript = transcriptObj;
        } else {
            this.parsedTranscript = { segments: [], key_moments: [] };
        }
    } else {
      this.parsedTranscript = null;
    }
  }

  private parseQuizData(video: Video | null): void {
    if (video && video.quiz_data && typeof video.quiz_data === 'string') {
        try {
            const parsedData = JSON.parse(video.quiz_data);
            if (parsedData && parsedData.title && Array.isArray(parsedData.questions)) {
                 this.parsedQuizData = parsedData as QuizData;
            } else {
                this.parsedQuizData = null;
            }
        } catch (e) {
            console.error("Error parsing quiz data JSON:", e);
            this.parsedQuizData = null;
        }
    } else if (video && typeof video.quiz_data === 'object' && video.quiz_data !== null) {
        this.parsedQuizData = video.quiz_data as QuizData;
    } else {
        this.parsedQuizData = null;
    }
  }


  private determineInitialVideoForTranscript(): void {
    if (this.project && this.project.videos && this.project.videos.length > 0) {
      const processingVideo = this.project.videos.find(v => v.status === 'processing' || v.status === 'uploaded' || v.status === 'generating_mindmap' || v.status === 'generating_quiz');
      if (processingVideo && processingVideo.id) {
        this.selectVideoForTranscript(processingVideo);
      } else {
        const completedVideos = this.project.videos.filter(v => v.status === 'completed');
        if (completedVideos.length > 0) {
            completedVideos.sort((a, b) => (new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime()));
            this.selectVideoForTranscript(completedVideos[0]);
        } else if (this.project.videos.length > 0) {
            this.selectVideoForTranscript(this.project.videos[this.project.videos.length - 1]);
        }
      }
    } else {
        this.currentVideoForTranscript = null;
        this.parsedTranscript = null;
        this.parsedQuizData = null;
    }
  }

  onVideoUploadStarted(video: Video): void {
    if (this.project && video.id) {
        if (!this.project.videos) this.project.videos = [];
        const existingVideoIndex = this.project.videos.findIndex(v => v.id === video.id);
        if (existingVideoIndex > -1) {
            this.project.videos[existingVideoIndex] = video;
        } else {
            this.project.videos.push(video);
        }
        this.selectVideoForTranscript(video);
        this.snackBar.open(`Video "${video.filename}" upload started and is now processing.`, 'Close');
    }
  }

  pollVideoStatus(videoId: number): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
    }
    this.isPollingVideo = true;

    this.pollingSub = timer(0, 3000)
      .pipe(
        switchMap(() => this.apiService.getVideoStatus(videoId)),
        takeWhile(video => video.status === 'processing' || video.status === 'uploaded' || video.status === 'generating_mindmap' || video.status === 'generating_quiz', true),
        finalize(() => {
            this.isPollingVideo = false;
            if(this.currentVideoForTranscript && this.currentVideoForTranscript.id === videoId) {
                this.apiService.getVideoStatus(videoId).subscribe(finalVideoState => {
                    this.currentVideoForTranscript = finalVideoState;
                    this.parseVideoData(finalVideoState); // Parse both transcript and quiz
                    if (this.project && this.project.videos) {
                        const index = this.project.videos.findIndex(v => v.id === videoId);
                        if (index !== -1) this.project.videos[index] = finalVideoState;
                    }

                    if (finalVideoState.status === 'completed') {
                        let message = `Video "${finalVideoState.filename}" processing completed.`;
                        if (this.isGeneratingMindmap && finalVideoState.mindmap_data) {
                            message = `Mind map for "${finalVideoState.filename}" generated successfully!`;
                            this.isGeneratingMindmap = false; 
                        } else if (this.isGeneratingQuiz && finalVideoState.quiz_data) {
                            message = `Quiz for "${finalVideoState.filename}" generated successfully!`;
                            this.isGeneratingQuiz = false;
                        }
                        this.snackBar.open(message, 'OK', { panelClass: 'snackbar-success' });
                    }
                });
            }
        })
      )
      .subscribe({
        next: (video) => {
          let videoUpdatedInList = false;
          if (this.project && this.project.videos) {
            const index = this.project.videos.findIndex(v => v.id === video.id);
            if (index !== -1) {
              this.project.videos[index] = {...this.project.videos[index], ...video};
              videoUpdatedInList = true;
            }
          }
          if (this.currentVideoForTranscript && this.currentVideoForTranscript.id === video.id) {
                 this.currentVideoForTranscript = {...this.currentVideoForTranscript, ...video};
                 this.parseVideoData(this.currentVideoForTranscript); // Parse both
          } else if (!this.currentVideoForTranscript && videoUpdatedInList) {
            this.selectVideoForTranscript(video);
          }

          if (video.status === 'completed') {
            if ((this.isGeneratingMindmap && video.mindmap_data) || (this.isGeneratingQuiz && video.quiz_data)) {
              // Notification handled in finalize
            }
          } else if (video.status === 'failed') {
            this.snackBar.open(`Video "${video.filename}" processing failed.`, 'Close', { panelClass: 'snackbar-error' });
            this.isGeneratingMindmap = false;
            this.isGeneratingQuiz = false;
            if (this.pollingSub) this.pollingSub.unsubscribe();
          }
        },
        error: (err) => {
          this.snackBar.open(`Error polling video status: ${err.message}`, 'Close', { panelClass: 'snackbar-error' });
          this.isGeneratingMindmap = false;
          this.isGeneratingQuiz = false;
           if (this.pollingSub) this.pollingSub.unsubscribe();
        }
      });
  }

  selectVideoForTranscript(video: Video): void {
    this.currentVideoForTranscript = video;
    this.parseVideoData(video); // Parse both transcript and quiz
    this.isGeneratingMindmap = video.status === 'generating_mindmap';
    this.isGeneratingQuiz = video.status === 'generating_quiz';

    if (video.id && (video.status === 'processing' || video.status === 'uploaded' || video.status === 'generating_mindmap' || video.status === 'generating_quiz')) {
        this.pollVideoStatus(video.id);
    } else {
        if (this.pollingSub) {
            this.pollingSub.unsubscribe();
            this.isPollingVideo = false;
        }
    }
  }

  triggerMindmapGeneration(videoId: number | undefined): void {
    if (!videoId || this.isGeneratingMindmap || this.isGeneratingQuiz) return;
    
    this.isGeneratingMindmap = true;
    if (this.currentVideoForTranscript) {
        this.currentVideoForTranscript.status = 'generating_mindmap';
        this.currentVideoForTranscript.mindmap_data = null;
    }
    if(this.project && this.project.videos){
        const videoInList = this.project.videos.find(v => v.id === videoId);
        if(videoInList) {
            videoInList.status = 'generating_mindmap';
            videoInList.mindmap_data = null;
        }
    }

    this.apiService.generateMindmap(videoId).subscribe({
      next: (response) => {
        this.snackBar.open(response.message, 'OK', { duration: 2000 });
        this.pollVideoStatus(videoId); 
      },
      error: (err) => {
        this.snackBar.open(`Error starting mind map generation: ${err.message}`, 'Close', { panelClass: 'snackbar-error' });
        if (this.currentVideoForTranscript) this.currentVideoForTranscript.status = 'completed';
         if(this.project && this.project.videos){
            const videoInList = this.project.videos.find(v => v.id === videoId);
            if(videoInList) videoInList.status = 'completed';
        }
        this.isGeneratingMindmap = false;
      },
    });
  }

  triggerQuizGeneration(videoId: number | undefined): void {
    if (!videoId || this.isGeneratingQuiz || this.isGeneratingMindmap) return;

    this.isGeneratingQuiz = true;
    if (this.currentVideoForTranscript) {
        this.currentVideoForTranscript.status = 'generating_quiz';
        this.currentVideoForTranscript.quiz_data = null; // Clear old quiz data
    }
     if(this.project && this.project.videos){
        const videoInList = this.project.videos.find(v => v.id === videoId);
        if(videoInList) {
            videoInList.status = 'generating_quiz';
            videoInList.quiz_data = null;
        }
    }
    this.apiService.generateQuiz(videoId).subscribe({
        next: (response) => {
            this.snackBar.open(response.message, 'OK', {duration: 2000});
            this.pollVideoStatus(videoId);
        },
        error: (err) => {
            this.snackBar.open(`Error starting quiz generation: ${err.message}`, 'Close', {panelClass: 'snackbar-error'});
            if (this.currentVideoForTranscript) this.currentVideoForTranscript.status = 'completed';
            if(this.project && this.project.videos){
                const videoInList = this.project.videos.find(v => v.id === videoId);
                if(videoInList) videoInList.status = 'completed';
            }
            this.isGeneratingQuiz = false;
        }
    });
  }

  openMindmapDialog(): void {
    if (this.currentVideoForTranscript && this.currentVideoForTranscript.mindmap_data) {
      this.dialog.open(MindmapDialog, {
        width: '95vw',
        maxWidth: '1200px',
        height: '85vh',
        data: { markdown: this.currentVideoForTranscript.mindmap_data, videoName: this.currentVideoForTranscript.filename }
      });
    } else {
      this.snackBar.open('Mind map data is not available for this video.', 'Close');
    }
  }

  openQuizDialog(): void {
    if (this.currentVideoForTranscript && this.parsedQuizData) {
        this.dialog.open(QuizDialog, {
            width: '95vw',
            maxWidth: '800px', // Quiz might not need as much width as mindmap
            maxHeight: '90vh',
            data: { quiz: this.parsedQuizData, videoName: this.currentVideoForTranscript.filename }
        });
    } else {
        this.snackBar.open('Quiz data is not available for this video.', 'Close');
    }
  }
  
  confirmDeleteVideo(event: MouseEvent, videoId: number | undefined, videoName: string | undefined): void {
    event.stopPropagation(); // Prevent triggering selectVideoForTranscript
    if (!videoId || !this.project?.id) return;

    // Simple browser confirm, replace with MatDialog for better UX
    if (confirm(`Are you sure you want to delete the video "${videoName || 'this video'}"? This action cannot be undone.`)) {
      this.deleteVideo(this.project.id, videoId);
    }
  }

  deleteVideo(projectId: number, videoId: number): void {
    this.apiService.deleteVideo(projectId, videoId).subscribe({
      next: () => {
        this.snackBar.open('Video deleted successfully.', 'OK', { panelClass: 'snackbar-success' });
        // Refresh project data or remove video from local list
        if (this.project && this.project.videos) {
          this.project.videos = this.project.videos.filter(v => v.id !== videoId);
          if (this.currentVideoForTranscript && this.currentVideoForTranscript.id === videoId) {
            this.currentVideoForTranscript = null;
            this.parsedTranscript = null;
            this.parsedQuizData = null;
            // Optionally select next video or show placeholder
            this.determineInitialVideoForTranscript(); 
          }
        }
      },
      error: (err) => {
        this.snackBar.open(`Error deleting video: ${err.message}`, 'Close', { panelClass: 'snackbar-error' });
      }
    });
  }


  goBackToProjects(): void {
    this.router.navigate(['/projects']);
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    if (this.pollingSub) this.pollingSub.unsubscribe();
  }
}
