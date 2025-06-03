import { CommonModule, JsonPipe } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, Input, OnChanges, OnDestroy, Renderer2, SimpleChanges, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Video, TranscriptSegment, VideoTranscript, KeyMoment } from '../../models/models';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs'; 
import { MatListModule } from '@angular/material/list'; 
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-transcript-display',
  standalone: true,
  imports: [
    CommonModule,
    JsonPipe,
    MatIconModule,
    MatCardModule,
    MatTabsModule, 
    MatListModule,
    MatDividerModule   
  ],
  templateUrl: './transcript-display.html',
  styleUrls: ['./transcript-display.scss']
})
export class TranscriptDisplay implements OnChanges, OnDestroy {
  @Input() video: Video | null = null;
  @Input() parsedTranscriptData: VideoTranscript | null = null; 

  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;
  @ViewChild('segmentsList') segmentsList!: ElementRef<HTMLUListElement>;
  
  segments: TranscriptSegment[] = [];
  keyMoments: KeyMoment[] = [];
  currentSegmentIndex: number = -1;
  
  public baseUrlForVideos = 'http://localhost:8000/static_videos';
  private timeUpdateListener?: () => void;

  constructor(private renderer: Renderer2, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['parsedTranscriptData'] && this.parsedTranscriptData) {
      this.segments = (this.parsedTranscriptData.segments || []).map(seg => ({
        ...seg,
        timestamp_start_seconds: this.timestampToSeconds(seg.timestamp_start),
        timestamp_end_seconds: this.timestampToSeconds(seg.timestamp_end)
      }));
      this.keyMoments = (this.parsedTranscriptData.key_moments || []).map(moment => ({
        ...moment,
        timestamp_start_seconds: this.timestampToSeconds(moment.timestamp_start)
      }));
      this.currentSegmentIndex = -1;
      this.setupVideoListener();
    } else if (changes['video'] && !this.video) {
        this.segments = [];
        this.keyMoments = [];
        this.currentSegmentIndex = -1;
        this.removeVideoListener();
    } else if (changes['video'] && this.video && !this.parsedTranscriptData && this.video.status === 'completed') {
        if (this.video.transcript && typeof this.video.transcript === 'string') {
            try {
                const tempParsed = JSON.parse(this.video.transcript) as VideoTranscript;
                this.segments = (tempParsed.segments || []).map(seg => ({
                    ...seg,
                    timestamp_start_seconds: this.timestampToSeconds(seg.timestamp_start),
                    timestamp_end_seconds: this.timestampToSeconds(seg.timestamp_end)
                }));
                this.keyMoments = (tempParsed.key_moments || []).map(moment => ({
                    ...moment,
                    timestamp_start_seconds: this.timestampToSeconds(moment.timestamp_start)
                }));
                this.setupVideoListener();
            } catch (e) {
                console.error("Fallback parsing error in TranscriptDisplay:", e);
                this.segments = [];
                this.keyMoments = [];
            }
        }
    }
  }

  setupVideoListener(): void {
    this.removeVideoListener();
    setTimeout(() => {
        if (this.videoPlayer && this.videoPlayer.nativeElement) {
          this.timeUpdateListener = this.renderer.listen(this.videoPlayer.nativeElement, 'timeupdate', () => {
            this.updateCurrentSegment();
          });
          this.renderer.listen(this.videoPlayer.nativeElement, 'loadedmetadata', () => {
            this.updateCurrentSegment();
          });
        }
    }, 0);
  }

  removeVideoListener(): void {
    if (this.timeUpdateListener) {
      this.timeUpdateListener();
      this.timeUpdateListener = undefined;
    }
  }

  timestampToSeconds(timestamp: string): number {
    if (!timestamp || typeof timestamp !== 'string') return 0;
    const parts = timestamp.split(/[:.]/);
    if (parts.length < 3) return 0;
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseInt(parts[2], 10) || 0;
    const milliseconds = parts.length > 3 ? (parseInt(parts[3], 10) || 0) : 0;
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  updateCurrentSegment(): void {
    if (!this.videoPlayer || !this.videoPlayer.nativeElement || !this.segments.length) {
      if (this.currentSegmentIndex !== -1) {
        this.currentSegmentIndex = -1;
        this.cdr.detectChanges();
      }
      return;
    }
    const currentTime = this.videoPlayer.nativeElement.currentTime;
    let activeIndex = -1;

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const startSeconds = segment.timestamp_start_seconds ?? 0;
      const endSeconds = segment.timestamp_end_seconds ?? Infinity; 

      if (currentTime >= startSeconds && currentTime < endSeconds) {
        activeIndex = i;
        break;
      }
    }
    if (activeIndex === -1 && this.segments.length > 0) {
        if (currentTime < (this.segments[0].timestamp_start_seconds ?? 0)) {
            // No active segment
        } else if (currentTime >= (this.segments[this.segments.length - 1].timestamp_end_seconds ?? Infinity)) {
            // activeIndex = this.segments.length - 1; // Optionally highlight last
        }
    }

    if (this.currentSegmentIndex !== activeIndex) {
        this.currentSegmentIndex = activeIndex;
        this.cdr.detectChanges(); 
        this.scrollToActiveSegment();
    }
  }
  
  scrollToActiveSegment(): void {
    if (this.currentSegmentIndex === -1 || !this.segmentsList || !this.segmentsList.nativeElement) {
      return;
    }
    const activeElement = this.segmentsList.nativeElement.querySelector(`#segment-${this.currentSegmentIndex}`);
    if (activeElement) {
      activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  seekVideo(timestamp: string): void {
    if (this.videoPlayer && this.videoPlayer.nativeElement) {
      const totalSeconds = this.timestampToSeconds(timestamp);
      if (!isNaN(totalSeconds)) {
        this.videoPlayer.nativeElement.currentTime = totalSeconds;
        this.videoPlayer.nativeElement.play().catch(err => console.error("Error playing video:", err));
      } else {
        console.warn("Calculated NaN for timestamp:", timestamp);
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

  isKeyMomentActive(keyMoment: KeyMoment): boolean {
    if (!this.videoPlayer?.nativeElement || keyMoment.timestamp_start_seconds === undefined) {
      return false;
    }
    
    const currentTime = this.videoPlayer.nativeElement.currentTime;
    const momentStartTime = keyMoment.timestamp_start_seconds;
    
    const currentIndex = this.keyMoments.findIndex(km => km.timestamp_start_seconds === momentStartTime);
    
    let momentEndTime = Infinity;
    if (currentIndex !== -1 && currentIndex < this.keyMoments.length - 1) {
      momentEndTime = this.keyMoments[currentIndex + 1].timestamp_start_seconds ?? Infinity;
    } else if (this.videoPlayer.nativeElement.duration && !isNaN(this.videoPlayer.nativeElement.duration)) {
      momentEndTime = this.videoPlayer.nativeElement.duration;
    }
    
    return currentTime >= momentStartTime && currentTime < momentEndTime;
  }

  ngOnDestroy(): void {
    this.removeVideoListener();
  }
}
