import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, Router } from '@angular/router';
import { Video } from '../../models/models';
import { Api } from '../../services/api';

@Component({
  selector: 'app-all-videos',
  imports: [
    CommonModule,
    RouterLink,
    DatePipe,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatRippleModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './all-videos.html',
  styleUrl: './all-videos.scss'
})
export class AllVideos implements OnInit {
  allVideos: (Video & { project_name?: string })[] = []; // Add project_name for context
  isLoading: boolean = true;
  errorMessage: string | null = null;

  constructor(
    private apiService: Api,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadAllVideos();
  }

  loadAllVideos(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.apiService.getAllVideos().subscribe({
      next: (videos) => {
        this.allVideos = videos.sort((a, b) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime());
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = `Error loading videos: ${err.message}`;
        this.isLoading = false;
        this.snackBar.open(this.errorMessage, 'Close', { panelClass: 'snackbar-error' });
        console.error(err);
      }
    });
  }

  viewVideoInProject(video: Video): void {
    if (video.project_id && video.id) {
      // Navigate to the project view, and the project view will handle selecting this video
      this.router.navigate(['/projects', video.project_id], { queryParams: { videoId: video.id } });
    } else {
      this.snackBar.open('Cannot navigate to video: Project or Video ID missing.', 'Close');
    }
  }
  
  getShareableLink(slug: string | null | undefined): string {
    if (!slug) return '';
    return `${window.location.origin}/public/video/${slug}`;
  }

  copyToClipboard(text: string, event: MouseEvent): void {
    event.stopPropagation(); // Prevent navigation if the link is inside a clickable card
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Link copied to clipboard!', 'OK', { duration: 2000 });
    }).catch(err => {
      console.error('Failed to copy link: ', err);
      this.snackBar.open('Failed to copy link.', 'Close', { panelClass: 'snackbar-error' });
    });
  }
}
