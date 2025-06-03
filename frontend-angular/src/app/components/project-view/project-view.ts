import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subscription, Subject, timer, switchMap, takeWhile, finalize } from 'rxjs';
import { Project, Video } from '../../models/models';
import { Api } from '../../services/api';
import { TranscriptDisplay } from '../transcript-display/transcript-display';
import { VideoUpload } from '../video-upload/video-upload';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatRippleModule } from '@angular/material/core';

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
    MatRippleModule
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
  isPollingVideo: boolean = false;
  private pollingSub?: Subscription;
  private ngUnsubscribe = new Subject<void>();

  constructor(
    private router: Router,
    private apiService: Api,
    private snackBar: MatSnackBar
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

  private determineInitialVideoForTranscript(): void {
    if (this.project && this.project.videos && this.project.videos.length > 0) {
      const processingVideo = this.project.videos.find(v => v.status === 'processing' || v.status === 'uploaded');
      if (processingVideo && processingVideo.id) {
        this.currentVideoForTranscript = processingVideo;
        this.pollVideoStatus(processingVideo.id);
      } else {
        const completedVideos = this.project.videos.filter(v => v.status === 'completed');
        if (completedVideos.length > 0) {
            completedVideos.sort((a, b) => (new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime()));
            this.currentVideoForTranscript = completedVideos[0];
        } else if (this.project.videos.length > 0) {
            this.currentVideoForTranscript = this.project.videos[this.project.videos.length - 1];
        }
      }
    } else {
        this.currentVideoForTranscript = null;
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
        this.currentVideoForTranscript = video;
        this.pollVideoStatus(video.id);
        this.snackBar.open(`Video "${video.filename}" upload started and is now processing.`, 'Close');
    }
  }

  pollVideoStatus(videoId: number): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
    }
    this.isPollingVideo = true;

    this.pollingSub = timer(0, 5000)
      .pipe(
        switchMap(() => this.apiService.getVideoStatus(videoId)),
        takeWhile(video => video.status === 'processing' || video.status === 'uploaded', true),
        finalize(() => this.isPollingVideo = false)
      )
      .subscribe({
        next: (video) => {
          if (this.project && this.project.videos) {
            const index = this.project.videos.findIndex(v => v.id === video.id);
            if (index !== -1) {
              this.project.videos[index] = {...this.project.videos[index], ...video};
            }
            if (this.currentVideoForTranscript && this.currentVideoForTranscript.id === video.id) {
                 this.currentVideoForTranscript = {...this.currentVideoForTranscript, ...video};
            }
          }
          if (video.status === 'completed') {
            this.snackBar.open(`Video "${video.filename}" processing completed.`, 'OK', { panelClass: 'snackbar-success' });
            if (this.pollingSub) this.pollingSub.unsubscribe();
          } else if (video.status === 'failed') {
            this.snackBar.open(`Video "${video.filename}" processing failed.`, 'Close', { panelClass: 'snackbar-error' });
            if (this.pollingSub) this.pollingSub.unsubscribe();
          }
        },
        error: (err) => {
          this.snackBar.open(`Error polling video status: ${err.message}`, 'Close', { panelClass: 'snackbar-error' });
          console.error('Error polling video status:', err);
           if (this.pollingSub) this.pollingSub.unsubscribe();
        }
      });
  }

  selectVideoForTranscript(video: Video): void {
    this.currentVideoForTranscript = video;
    if (video.id && (video.status === 'processing' || video.status === 'uploaded')) {
        this.pollVideoStatus(video.id);
    } else {
        if (this.pollingSub) {
            this.pollingSub.unsubscribe();
            this.isPollingVideo = false;
        }
    }
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
