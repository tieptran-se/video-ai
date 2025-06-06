import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion';
import { QuizData, QuizQuestion, QuizQuestionOption } from '../../models/models';
import { Subscription, timer, map, takeWhile } from 'rxjs';

export interface QuizDialogData {
  quiz: QuizData;
  videoName: string;
}

@Component({
  selector: 'app-quiz-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatCheckboxModule,
    MatExpansionModule
  ],
  templateUrl: './quiz-dialog.html',
  styleUrl: './quiz-dialog.scss'
})
export class QuizDialog implements OnInit, OnDestroy {
  userAnswers: { [questionIndex: number]: string | string[] } = {};
  showResults = false;
  score = 0;

  // Timer properties
  private countdownSubscription!: Subscription;
  public timeRemaining: number = 15 * 60; // 15 minutes in seconds
  public timerDisplay: string = '15:00';
  
  constructor(
    public dialogRef: MatDialogRef<QuizDialog>,
    @Inject(MAT_DIALOG_DATA) public data: QuizDialogData
  ) {}

  ngOnInit(): void {
    this.startTimer();
    this.data.quiz.questions.forEach((q, index) => {
      if (q.question_type === 'multiple-choice') {
        this.userAnswers[index] = [];
      }
    });
  }
  
  ngOnDestroy(): void {
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
  }
  
  startTimer(): void {
    this.countdownSubscription = timer(0, 1000).pipe(
      map(i => this.timeRemaining - i),
      takeWhile(val => val >= 0)
    ).subscribe({
      next: (val) => {
        const minutes = Math.floor(val / 60);
        const seconds = val % 60;
        this.timerDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      },
      complete: () => {
        if (!this.showResults) {
            this.submitQuiz();
        }
      }
    });
  }

  onSingleChoiceChange(questionIndex: number, optionText: string): void { 
    this.userAnswers[questionIndex] = optionText;
  }

  onMultiChoiceChange(questionIndex: number, optionText: string, event: any): void { 
    const checkbox = event.target as HTMLInputElement;
    const currentAnswers = (this.userAnswers[questionIndex] as string[] | undefined) || [];

    if (checkbox.checked) {
      if (!currentAnswers.includes(optionText)) {
        this.userAnswers[questionIndex] = [...currentAnswers, optionText];
      }
    } else {
      this.userAnswers[questionIndex] = currentAnswers.filter(ans => ans !== optionText);
    }
  }
  
  isOptionSelectedForMulti(questionIndex: number, optionText: string): boolean {
    const answers = this.userAnswers[questionIndex] as string[];
    return answers && answers.includes(optionText);
  }

  submitQuiz(): void {
    if (this.countdownSubscription) {
        this.countdownSubscription.unsubscribe();
    }
    this.score = 0;
    this.data.quiz.questions.forEach((q, qIndex) => {
      const userAnswer = this.userAnswers[qIndex];
      if (q.question_type === 'single-choice') {
        const correctOption = q.options.find(opt => opt.is_correct);
        if (correctOption && userAnswer === correctOption.text) {
          this.score++;
        }
      } else if (q.question_type === 'multiple-choice') {
        const correctOptions = q.options.filter(opt => opt.is_correct).map(opt => opt.text);
        const userSelectedOptions = userAnswer as string[];
        
        if (userSelectedOptions && correctOptions.length === userSelectedOptions.length && correctOptions.every(opt => userSelectedOptions.includes(opt))) {
          this.score++;
        }
      }
    });
    this.showResults = true;
  }

  getOptionClasses(option: QuizQuestionOption, question: QuizQuestion, questionIndex: number): any {
    const userAnswer = this.userAnswers[questionIndex];
    let isSelectedByUser = false;

    if (question.question_type === 'single-choice') {
      isSelectedByUser = userAnswer === option.text;
    } else if (question.question_type === 'multiple-choice' && Array.isArray(userAnswer)) {
      isSelectedByUser = userAnswer.includes(option.text);
    }

    return {
      'text-green-600 font-semibold': option.is_correct,
      'text-red-600': !option.is_correct && isSelectedByUser,
      'text-gray-600': !option.is_correct && !isSelectedByUser
    };
  }

  getOptionResultIconDetails(option: QuizQuestionOption, question: QuizQuestion, questionIndex: number): { iconName: string; iconClass: string } | null {
    if (!this.showResults) return null; 

    const userAnswer = this.userAnswers[questionIndex];
    let isSelectedByUser = false;

    if (question.question_type === 'single-choice') {
        isSelectedByUser = (userAnswer === option.text);
    } else if (question.question_type === 'multiple-choice' && Array.isArray(userAnswer)) {
        isSelectedByUser = userAnswer.includes(option.text);
    }

    if (option.is_correct) {
        return { iconName: 'check_circle_outline', iconClass: 'text-green-600' };
    } else if (isSelectedByUser) { 
        return { iconName: 'cancel_outline', iconClass: 'text-red-600' };
    }
    
    return null; 
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
