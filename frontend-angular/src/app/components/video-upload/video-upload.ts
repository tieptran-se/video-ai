import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Api } from '../../services/api';
import { Video } from '../../models/models';
import { finalize } from 'rxjs/operators';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-video-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule // Add spinner module here
  ],
  templateUrl: './video-upload.html',
  styleUrl: './video-upload.scss'
})
export class VideoUpload implements OnInit {
  @Input() projectId!: number;
  @Output() videoProcessingStarted = new EventEmitter<Video>(); 

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  uploadProgress: number = 0;
  isUploading: boolean = false;
  
  constructor(private apiService: Api, private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    if (!this.projectId) {
      console.error("Project ID is required for video upload.");
    }
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      this.selectedFile = fileList[0];
      this.uploadProgress = 0;
    } else {
      this.selectedFile = null;
    }
  }

  onUpload(): void {
    if (!this.selectedFile || !this.projectId) {
      this.snackBar.open("Please select a video file to upload.", 'Close');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    this.apiService.uploadVideo(this.projectId, this.selectedFile)
      .pipe(
        finalize(() => {
          this.isUploading = false;
          // Do not reset uploadProgress here if you want to show 100% briefly
          if (this.fileInput) {
            this.fileInput.nativeElement.value = "";
          }
          // Keep selectedFile until upload is fully done or failed to show name
          // this.selectedFile = null; 
        })
      )
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.uploadProgress = Math.round(100 * (event.loaded / event.total));
          } else if (event.type === HttpEventType.Response && event.body) {
            const uploadedVideo = event.body as Video;
            this.snackBar.open(`Video "${uploadedVideo.filename}" uploaded. Processing started.`, 'OK', { panelClass: 'snackbar-success' });
            if (uploadedVideo.id) {
                this.videoProcessingStarted.emit(uploadedVideo);
            }
            this.selectedFile = null; // Clear after successful processing start
            this.uploadProgress = 0; // Reset progress after success
          }
        },
        error: (err: HttpErrorResponse) => {
          let errorMessage = `Upload failed: ${err.error?.detail || err.message || 'Server error'}`;
          if (err.status === 0) {
            errorMessage = "Upload failed: Could not connect to server. Check network.";
          }
          this.snackBar.open(errorMessage, 'Close', { panelClass: 'snackbar-error' });
          console.error('Upload error:', err);
          this.uploadProgress = 0; // Reset progress on error
        }
      });
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }
}
