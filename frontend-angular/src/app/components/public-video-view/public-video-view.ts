import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
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
import { PublicVideoData, VideoTranscript, QuizData, Video, ChatRequest } from '../../models/models';
import { Api } from '../../services/api';
import { TranscriptDisplay } from '../transcript-display/transcript-display';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  safeContent?: SafeHtml;
  isTyping?: boolean;
}

@Component({
  selector: 'app-public-video-view',
  standalone: true,
  imports: [
    CommonModule, DatePipe, JsonPipe, RouterLink, FormsModule,
    TranscriptDisplay,
    MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule,
    MatTooltipModule, MatChipsModule, MatFormFieldModule, MatInputModule
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
  
  @ViewChild('chatMessagesContainer') private chatMessagesContainer!: ElementRef;
  chatHistory: ChatMessage[] = [];
  userMessage: string = '';
  isChatLoading: boolean = false;
  private typingInterval?: any;

  constructor(
    private route: ActivatedRoute, 
    private apiService: Api,
    private snackBar: MatSnackBar,
    public dialog: MatDialog,
    private sanitizer: DomSanitizer
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
  
  ngAfterViewInit(): void {
    this.scrollToChatBottom();
  }
  
  ngOnDestroy(): void {
      if(this.typingInterval) {
          clearInterval(this.typingInterval);
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
        
        const { transcript, quiz_data, ...restOfData } = data;
        this.videoForDisplay = {
          ...restOfData,
          status: 'completed',
          transcript: this.parsedTranscript,
          quiz_data: this.parsedQuizData,
        };
        this.isLoading = false;
        
        this.chatHistory.push({ role: 'assistant', content: `I'm ready to answer questions about the video "${data.filename}".` });
      },
      error: (err) => {
        this.errorMessage = `Error loading public video: ${err.message}`;
        if (err.status === 404) this.errorMessage = "The requested video was not found or is not public.";
        this.isLoading = false;
        this.snackBar.open(this.errorMessage, 'Close', { panelClass: 'snackbar-error' });
      }
    });
  }

  sendChatMessage(): void {
    if (!this.userMessage.trim() || !this.slug || this.isChatLoading) {
        return;
    }
    const question = this.userMessage;
    this.chatHistory.push({ role: 'user', content: question });
    this.userMessage = '';
    this.isChatLoading = true;
    this.scrollToChatBottom();

    // **THE FIX IS HERE**
    // Map the complex ChatMessage[] to a simple {role, content}[] that matches the backend model.
    const cleanHistory = this.chatHistory.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
    }));

    const request: ChatRequest = {
        question: question,
        chat_history: cleanHistory
    };

    this.apiService.chatWithVideo(this.slug, request).subscribe({
        next: (response) => {
            this.isChatLoading = false;
            this.typeOutResponse(response.answer);
        },
        error: (err) => {
            this.isChatLoading = false;
            this.typeOutResponse(`Sorry, I encountered an error: ${err.message}`);
        }
    });
  }
  
  private typeOutResponse(fullText: string) {
    const assistantMessage: ChatMessage = { role: 'assistant', content: '', isTyping: true };
    this.chatHistory.push(assistantMessage);
    this.scrollToChatBottom();
    
    let i = 0;
    this.typingInterval = setInterval(() => {
        if (i < fullText.length) {
            assistantMessage.content += fullText.charAt(i);
            assistantMessage.safeContent = this.parseSimpleMarkdown(assistantMessage.content);
            i++;
            this.scrollToChatBottom();
        } else {
            clearInterval(this.typingInterval);
            assistantMessage.isTyping = false;
        }
    }, 20);
  }

  private parseSimpleMarkdown(text: string): SafeHtml {
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private scrollToChatBottom(): void {
    try {
        setTimeout(() => {
            if(this.chatMessagesContainer) {
                this.chatMessagesContainer.nativeElement.scrollTop = this.chatMessagesContainer.nativeElement.scrollHeight;
            }
        }, 0);
    } catch (err) { }
  }
  
  openMindmapDialog(): void {
    if (this.videoData?.mindmap_data) {
      this.dialog.open(MindmapDialog, {
        width: '90vw', maxWidth: '1200px', height: '70vh',
        data: { markdown: this.videoData.mindmap_data, videoName: this.videoData.filename }
      });
    } else this.snackBar.open('Mind map data is not available.', 'Close');
  }

  openQuizDialog(): void {
    if (this.parsedQuizData) {
        this.dialog.open(QuizDialog, {
            width: '80vw', maxWidth: '90vw', maxHeight: '90vh',
            data: { quiz: this.parsedQuizData, videoName: this.videoData?.filename }
        });
    } else this.snackBar.open('Quiz data is not available.', 'Close');
  }
}
