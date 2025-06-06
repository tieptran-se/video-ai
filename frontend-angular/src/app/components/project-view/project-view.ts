import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, Subject, timer, switchMap, takeWhile, finalize } from 'rxjs';
import { Project, QuizData, Video, VideoTranscript } from '../../models/models';
import { TranscriptDisplay } from '../transcript-display/transcript-display';
import { VideoUpload } from '../video-upload/video-upload';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Api } from '../../services/api';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog';
import { QuizDialog } from '../quiz-dialog/quiz-dialog';
import { MindmapDialog } from '../mindmap-dialog/mindmap-dialog';

@Component({
  selector: 'app-project-view',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    JsonPipe,
    RouterLink,
    VideoUpload,
    TranscriptDisplay,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatDividerModule,
    MatRippleModule,
    MatTooltipModule,
    MatMenuModule,
    MatFormFieldModule,
    MatIconModule,
    MatChipsModule
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
  parsedQuizData: QuizData | null = null;
  isPollingVideo: boolean = false;
  isGeneratingMindmap: boolean = false;
  isGeneratingQuiz: boolean = false;
  editingTagsVideoId: number | null = null;
  currentTags: string[] = [];

  private pollingSub?: Subscription;
  private ngUnsubscribe = new Subject<void>();

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
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
    }
  }

  loadProjectData(projectId: number): void {
    this.isLoadingProject = true;
    this.errorMessage = null;
    this.apiService.getProject(projectId).subscribe({
        next: (data) => {
            if (data) {
                this.project = data;
                if (this.project.videos) {
                    this.project.videos.sort((a,b) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime());
                }
                this.determineInitialVideoForTranscript();
            } else {
                this.errorMessage = "Project not found.";
                this.snackBar.open(this.errorMessage, 'Close');
            }
            this.isLoadingProject = false;
        },
        error: (err) => {
            this.errorMessage = err.message;
            this.snackBar.open(`Error loading project: ${err.message}`, 'Close', { panelClass: 'snackbar-error' });
            this.isLoadingProject = false;
        }
    });
  }

  private parseVideoData(video: Video | null): void {
    if (video && video.transcript && typeof video.transcript === 'string') {
      try {
        const parsedData = JSON.parse(video.transcript);
        this.parsedTranscript = (parsedData && Array.isArray(parsedData.segments) && Array.isArray(parsedData.key_moments))
            ? parsedData as VideoTranscript
            : { segments: [], key_moments: [] };
      } catch (e) {
        this.parsedTranscript = { segments: [], key_moments: [] };
      }
    } else if (video && typeof video.transcript === 'object' && video.transcript !== null) {
        this.parsedTranscript = video.transcript as VideoTranscript;
    } else {
      this.parsedTranscript = null;
    }

    if (video && video.quiz_data && typeof video.quiz_data === 'string') {
        try {
            const parsedData = JSON.parse(video.quiz_data);
            this.parsedQuizData = (parsedData && parsedData.title && Array.isArray(parsedData.questions))
                ? parsedData as QuizData
                : null;
        } catch (e) { this.parsedQuizData = null; }
    } else if (video && typeof video.quiz_data === 'object' && video.quiz_data !== null) {
        this.parsedQuizData = video.quiz_data as QuizData;
    } else {
        this.parsedQuizData = null;
    }
  }

  private determineInitialVideoForTranscript(): void {
    const queryParamVideoId = this.activatedRoute.snapshot.queryParams['videoId'];
    if (queryParamVideoId && this.project?.videos) {
        const videoFromQuery = this.project.videos.find(v => v.id == queryParamVideoId);
        if (videoFromQuery) {
            this.selectVideoForTranscript(videoFromQuery);
            this.router.navigate([], {
                relativeTo: this.activatedRoute,
                queryParams: { videoId: null },
                queryParamsHandling: 'merge', 
            });
            return;
        }
    }

    if (this.project?.videos?.length) {
      const inProgressVideo = this.project.videos.find(v => ['processing', 'generating_mindmap', 'generating_quiz', 'uploaded'].includes(v.status || ''));
      if (inProgressVideo) {
        this.selectVideoForTranscript(inProgressVideo);
        return;
      }
      this.selectVideoForTranscript(this.project.videos[0]);
    } else {
        this.currentVideoForTranscript = null;
        this.parsedTranscript = null;
        this.parsedQuizData = null;
    }
  }

  onVideoUploadStarted(video: Video): void {
    if (this.project && video.id) {
        if (!this.project.videos) this.project.videos = [];
        this.project.videos.unshift(video);
        this.selectVideoForTranscript(video);
        this.snackBar.open(`Video "${video.filename}" upload started and is now processing.`, 'Close');
    }
  }

  pollVideoStatus(videoId: number): void {
    if (this.pollingSub) this.pollingSub.unsubscribe();
    this.isPollingVideo = true;
    this.pollingSub = timer(0, 3000).pipe(
      switchMap(() => this.apiService.getVideoStatus(videoId)),
      takeWhile(video => ['processing', 'uploaded', 'generating_mindmap', 'generating_quiz'].includes(video.status || ''), true),
      finalize(() => {
        this.isPollingVideo = false;
        if (this.currentVideoForTranscript?.id === videoId) {
          this.apiService.getVideoStatus(videoId).subscribe(finalVideoState => this.handleFinalVideoState(finalVideoState));
        }
      })
    ).subscribe({
      next: (video) => this.updateLocalVideoState(video),
      error: (err) => this.handlePollingError(err)
    });
  }
  
  handleFinalVideoState(finalVideoState: Video): void {
    this.updateLocalVideoState(finalVideoState);
    if (finalVideoState.status === 'completed') {
      let message = `Video "${finalVideoState.filename}" processing completed.`;
      let action = 'OK';
      if (this.isGeneratingMindmap && finalVideoState.mindmap_data) {
        message = `Mind map for "${finalVideoState.filename}" generated successfully!`;
        this.isGeneratingMindmap = false; 
      } else if (this.isGeneratingQuiz && finalVideoState.quiz_data) {
        message = `Quiz for "${finalVideoState.filename}" generated successfully!`;
        this.isGeneratingQuiz = false;
        action = 'View Quiz';
      }
      const snackBarRef = this.snackBar.open(message, action, { panelClass: 'snackbar-success' });
      if (action === 'View Quiz') {
        snackBarRef.onAction().subscribe(() => this.openQuizDialog());
      }
    }
  }
  
  handlePollingError(err: any): void {
    this.snackBar.open(`Error polling video status: ${err.message}`, 'Close', { panelClass: 'snackbar-error' });
    this.isGeneratingMindmap = false;
    this.isGeneratingQuiz = false;
  }

  selectVideoForTranscript(video: Video): void {
    this.currentVideoForTranscript = video;
    this.parseVideoData(video);
    this.isGeneratingMindmap = video.status === 'generating_mindmap';
    this.isGeneratingQuiz = video.status === 'generating_quiz';
    this.editingTagsVideoId = null; 
    if (video.id && ['processing', 'uploaded', 'generating_mindmap', 'generating_quiz'].includes(video.status || '')) {
      this.pollVideoStatus(video.id);
    } else {
      if (this.pollingSub) this.pollingSub.unsubscribe();
      this.isPollingVideo = false;
    }
  }

  triggerMindmapGeneration(): void {
    if (!this.currentVideoForTranscript?.id || this.isGeneratingMindmap || this.isGeneratingQuiz) return;
    const videoId = this.currentVideoForTranscript.id;
    this.isGeneratingMindmap = true;
    this.updateVideoStatusOptimistically(videoId, 'generating_mindmap', { mindmap_data: null });
    this.apiService.generateMindmap(videoId).subscribe({
      next: (response) => {
        this.snackBar.open(response.message, 'OK', { duration: 2000 });
        this.pollVideoStatus(videoId); 
      },
      error: (err) => this.handleGenerationError(err, videoId, 'mind map')
    });
  }

  triggerQuizGeneration(): void {
    if (!this.currentVideoForTranscript?.id || this.isGeneratingQuiz || this.isGeneratingMindmap) return;
    const videoId = this.currentVideoForTranscript.id;
    this.isGeneratingQuiz = true;
    this.updateVideoStatusOptimistically(videoId, 'generating_quiz', { quiz_data: null });
    this.apiService.generateQuiz(videoId).subscribe({
      next: (response) => {
        this.snackBar.open(response.message, 'OK', { duration: 2000 });
        this.pollVideoStatus(videoId);
      },
      error: (err) => this.handleGenerationError(err, videoId, 'quiz')
    });
  }

  updateVideoStatusOptimistically(videoId: number, status: Video['status'], updates: Partial<Video>): void {
    if (this.currentVideoForTranscript?.id === videoId) this.currentVideoForTranscript = { ...this.currentVideoForTranscript, ...updates, status };
    if (this.project?.videos) {
      const videoInList = this.project.videos.find(v => v.id === videoId);
      if (videoInList) Object.assign(videoInList, updates, { status });
    }
  }

  handleGenerationError(err: any, videoId: number, type: 'mind map' | 'quiz'): void {
    this.snackBar.open(`Error starting ${type} generation: ${err.message}`, 'Close', {panelClass: 'snackbar-error'});
    this.updateVideoStatusOptimistically(videoId, 'completed', {});
    if (type === 'mind map') this.isGeneratingMindmap = false;
    if (type === 'quiz') this.isGeneratingQuiz = false;
  }

  openMindmapDialog(): void {
    if (this.currentVideoForTranscript?.mindmap_data) {
      this.dialog.open(MindmapDialog, {
        width: '90vw', maxWidth: '1200px', height: '75vh',
        data: { markdown: this.currentVideoForTranscript.mindmap_data, videoName: this.currentVideoForTranscript.filename }
      });
    } else this.snackBar.open('Mind map data is not available.', 'Close');
  }

  openQuizDialog(): void {
    if (this.currentVideoForTranscript && this.parsedQuizData) {
      this.dialog.open(QuizDialog, {
        width: '85vw', maxWidth: '90vw', maxHeight: '90vh',
        data: { quiz: this.parsedQuizData, videoName: this.currentVideoForTranscript.filename }
      });
    } else this.snackBar.open('Quiz data is not available.', 'Close');
  }
  
  confirmDeleteVideo(event: MouseEvent, video: Video): void {
    event.stopPropagation(); 
    if (!video.id || !this.project?.id) return;
    const dialogRef = this.dialog.open(ConfirmationDialog, {
      width: '350px',
      data: { 
        title: 'Confirm Deletion',
        message: `Are you sure you want to delete the video "${video.filename || 'this video'}"? This action cannot be undone.`
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.deleteVideo(this.project!.id!, video.id!);
    });
  }

  deleteVideo(projectId: number, videoId: number): void {
    this.apiService.deleteVideo(projectId, videoId).subscribe({
      next: () => {
        this.snackBar.open('Video deleted successfully.', 'OK', { panelClass: 'snackbar-success' });
        if (this.project?.videos) {
          this.project.videos = this.project.videos.filter(v => v.id !== videoId);
          if (this.currentVideoForTranscript?.id === videoId) this.determineInitialVideoForTranscript();
        }
      },
      error: (err) => this.snackBar.open(`Error deleting video: ${err.message}`, 'Close', { panelClass: 'snackbar-error' })
    });
  }

  startEditTags(event: MouseEvent, video: Video): void {
    event.stopPropagation();
    this.editingTagsVideoId = video.id ?? null;
    this.currentTags = [...(video.tags || [])];
  }

  addTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value && !this.currentTags.includes(value)) this.currentTags.push(value);
    event.chipInput!.clear();
  }

  removeTag(tag: string): void {
    const index = this.currentTags.indexOf(tag);
    if (index >= 0) this.currentTags.splice(index, 1);
  }

  saveTags(video: Video): void {
    if (!video.id) return;
    this.apiService.updateVideoTags(video.id, this.currentTags).subscribe({
      next: (updatedVideo) => {
        this.snackBar.open('Tags updated successfully!', 'OK', { panelClass: 'snackbar-success'});
        this.updateLocalVideoState(updatedVideo);
        this.editingTagsVideoId = null;
      },
      error: (err) => this.snackBar.open(`Error updating tags: ${err.message}`, 'Close', {panelClass: 'snackbar-error'})
    });
  }

  cancelTagEdit(): void {
    this.editingTagsVideoId = null;
    this.currentTags = [];
  }

  publishVideo(video: Video): void {
    if (!video.id) return;
    this.apiService.publishVideo(video.id).subscribe({
      next: (updatedVideo) => {
        this.snackBar.open(`Video "${updatedVideo.filename}" published!`, 'OK', {panelClass: 'snackbar-success'});
        this.updateLocalVideoState(updatedVideo);
      },
      error: (err) => this.snackBar.open(`Error publishing video: ${err.message}`, 'Close', {panelClass: 'snackbar-error'})
    });
  }

  unpublishVideo(video: Video): void {
    if (!video.id) return;
    this.apiService.unpublishVideo(video.id).subscribe({
      next: (updatedVideo) => {
        this.snackBar.open(`Video "${updatedVideo.filename}" unpublished.`, 'OK');
        this.updateLocalVideoState(updatedVideo);
      },
      error: (err) => this.snackBar.open(`Error unpublishing video: ${err.message}`, 'Close', {panelClass: 'snackbar-error'})
    });
  }

  updateLocalVideoState(updatedVideo: Video): void {
    if (this.project && this.project.videos) {
      const index = this.project.videos.findIndex(v => v.id === updatedVideo.id);
      if (index !== -1) {
        this.project.videos[index] = { ...this.project.videos[index], ...updatedVideo };
      }
    }
    if (this.currentVideoForTranscript?.id === updatedVideo.id) {
      this.currentVideoForTranscript = { ...this.currentVideoForTranscript, ...updatedVideo };
      this.parseVideoData(this.currentVideoForTranscript);
    }
  }

  getShareableLink(slug: string | null | undefined): string {
    if (!slug) return '';
    return `${window.location.origin}/public/video/${slug}`;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Link copied to clipboard!', 'OK', { duration: 2000 });
    }).catch(err => {
      console.error('Failed to copy link: ', err);
      this.snackBar.open('Failed to copy link.', 'Close', { panelClass: 'snackbar-error'});
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
