import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

@Component({
  selector: 'app-confirmation-dialog',
  template: `
    <h2 mat-dialog-title class="flex items-center">
        <mat-icon color="warn" class="mr-2">warning_amber</mat-icon>
        {{ data.title }}
    </h2>
    <mat-dialog-content class="py-4">{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button (click)="onNoClick()">{{ data.cancelButtonText || 'Cancel' }}</button>
      <button mat-flat-button color="warn" [mat-dialog-close]="true" cdkFocusInitial>{{ data.confirmButtonText || 'Delete' }}</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, CommonModule]
})
export class ConfirmationDialog {
constructor(
    public dialogRef: MatDialogRef<ConfirmationDialog>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData,
  ) {}

  onNoClick(): void {
    this.dialogRef.close(false);
  }
}
