import { Component, Input, OnInit } from '@angular/core';
import { QuizDialog } from '../quiz-dialog/quiz-dialog';
import { MindmapDialog } from '../mindmap-dialog/mindmap-dialog';
import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { PublicVideoData, VideoTranscript, QuizData, Video } from '../../models/models';
import { Api } from '../../services/api';
import { TranscriptDisplay } from '../transcript-display/transcript-display';

@Component({
  selector: 'app-public-video-view',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    JsonPipe,
    RouterLink,
    TranscriptDisplay,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './public-video-view.html',
  styleUrl: './public-video-view.scss'
})
export class PublicVideoView implements OnInit {
@Input() slug?: string;

  videoData: PublicVideoData | null = null;
  videoForDisplay: Video | null = null;
  isLoading: boolean = true;
  errorMessage: string | null = null;
  parsedTranscript: VideoTranscript | null = null;
  parsedQuizData: QuizData | null = null;


  constructor(
    private route: ActivatedRoute, 
    private apiService: Api,
    private snackBar: MatSnackBar,
    public dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.slug) {
      this.loadPublicVideo(this.slug);
    } else {
      const routeSlug = this.route.snapshot.paramMap.get('slug');
      if (routeSlug) {
        this.slug = routeSlug;
        this.loadPublicVideo(this.slug);
      } else {
        this.errorMessage = "Video identifier not found.";
        this.isLoading = false;
      }
    }
  }

  loadPublicVideo(slug: string): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.apiService.getPublicVideoBySlug(slug).subscribe({
      next: (data) => {
        this.videoData = data;
        this.parsedTranscript = data.transcript || { segments: [], key_moments: [] };
        this.parsedQuizData = data.quiz_data || null;
        
        // This is the corrected object construction to satisfy the 'Video' type.
        // It separates the incompatible properties and explicitly assigns the parsed (and correctly typed) versions.
        const { transcript, quiz_data, ...restOfData } = data;
        this.videoForDisplay = {
          ...restOfData,
          status: 'completed', // Public videos are always considered 'completed' for display purposes
          transcript: this.parsedTranscript, // Use the parsed object, which fits `string | VideoTranscript | null | undefined`
          quiz_data: this.parsedQuizData, // Use the parsed object, which fits `string | QuizData | null | undefined`
        };

        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = `Error loading public video: ${err.message}`;
        if (err.status === 404) {
          this.errorMessage = "The requested video was not found or is not public.";
        }
        this.isLoading = false;
        this.snackBar.open(this.errorMessage, 'Close', { panelClass: 'snackbar-error' });
      }
    });
  }
  
  openMindmapDialog(): void {
    if (this.videoData && this.videoData.mindmap_data) {
      this.dialog.open(MindmapDialog, {
        width: '90vw', maxWidth: '1200px', height: '85vh',
        data: { markdown: this.videoData.mindmap_data, videoName: this.videoData.filename }
      });
    } else {
      this.snackBar.open('Mind map data is not available for this video.', 'Close');
    }
  }

  openQuizDialog(): void {
    if (this.videoData && this.parsedQuizData) {
        this.dialog.open(QuizDialog, {
            width: '80vw', maxWidth: '95vw', maxHeight: '90vh',
            data: { quiz: this.parsedQuizData, videoName: this.videoData.filename }
        });
    } else {
        this.snackBar.open('Quiz data is not available for this video.', 'Close');
    }
  }
}
