import { CommonModule, JsonPipe } from '@angular/common';
import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Video, TranscriptSegment } from '../../models/models';

@Component({
  selector: 'app-transcript-display',
  standalone: true,
  imports: [
    CommonModule,
    JsonPipe,
    MatIconModule
  ],
  templateUrl: './transcript-display.html',
  styleUrls: ['./transcript-display.scss']
})
export class TranscriptDisplay implements OnChanges {
  @Input() video: Video | null = null;
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;
  transcriptSegments: TranscriptSegment[] = [];
  public baseUrlForVideos = 'http://localhost:8000/static_videos';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['video'] && this.video) {
      if (this.video.status === 'completed' && this.video.transcript) {
        if (typeof this.video.transcript === 'string') {
          try {
            this.transcriptSegments = JSON.parse(this.video.transcript);
          } catch (e) {
            console.error("Error parsing transcript JSON for video " + this.video.id + ":", e);
            this.transcriptSegments = [];
          }
        } else if (Array.isArray(this.video.transcript)) {
           this.transcriptSegments = this.video.transcript;
        } else {
          this.transcriptSegments = [];
        }
      } else {
        this.transcriptSegments = [];
      }
    } else if (!this.video) {
        this.transcriptSegments = [];
    }
  }

  seekVideo(timestamp: string): void {
    if (this.videoPlayer && this.videoPlayer.nativeElement) {
      try {
        const parts = timestamp.split(/[:.]/);
        if (parts.length >= 3) { 
          const hours = parseInt(parts[0], 10);
          const minutes = parseInt(parts[1], 10);
          const seconds = parseInt(parts[2], 10);
          const milliseconds = parts.length > 3 ? parseInt(parts[3], 10) : 0;
          const totalSeconds = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
          
          if (!isNaN(totalSeconds)) {
            this.videoPlayer.nativeElement.currentTime = totalSeconds;
            this.videoPlayer.nativeElement.play().catch(err => console.error("Error playing video:", err));
          } else {
            console.warn("Calculated NaN for timestamp:", timestamp);
          }
        } else {
          console.warn("Timestamp format not recognized for seeking:", timestamp);
        }
      } catch (e) {
        console.error("Error seeking video:", e);
      }
    }
  }

  getVideoSource(): string | null {
    if (this.video && this.video.filepath) {
      const filename = this.video.filepath.split('/').pop();
      return filename ? `${this.baseUrlForVideos}/${filename}` : null;
    }
    return null;
  }
}
