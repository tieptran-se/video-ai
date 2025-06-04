import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion';
import { QuizData, QuizQuestion, QuizQuestionOption } from '../../models/models';

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
export class QuizDialog implements OnInit {
  userAnswers: { [questionIndex: number]: string | string[] } = {};
  showResults = false;
  score = 0;

  constructor(
    public dialogRef: MatDialogRef<QuizDialog>,
    @Inject(MAT_DIALOG_DATA) public data: QuizDialogData
  ) { }

  ngOnInit(): void {
    this.data.quiz.questions.forEach((q, index) => {
      if (q.question_type === 'multiple-choice') {
        this.userAnswers[index] = [];
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

  // Method to get CSS classes for quiz options in results view
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

  // New method to determine icon and its class based on option correctness and user selection
  getOptionResultIconDetails(option: QuizQuestionOption, question: QuizQuestion, questionIndex: number): { iconName: string; iconClass: string } | null {
    if (option.is_correct) {
      return { iconName: 'check_circle_outline', iconClass: 'text-green-600' };
    }

    // Check if this incorrect option was selected by the user
    const userAnswer = this.userAnswers[questionIndex];
    let isSelectedIncorrectly = false;
    if (question.question_type === 'single-choice') {
      isSelectedIncorrectly = (userAnswer === option.text);
    } else if (question.question_type === 'multiple-choice' && Array.isArray(userAnswer)) {
      isSelectedIncorrectly = userAnswer.includes(option.text);
    }

    if (isSelectedIncorrectly) {
      return { iconName: 'cancel_outline', iconClass: 'text-red-600' };
    }

    return null; // No icon if it's an incorrect option that the user didn't select
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
