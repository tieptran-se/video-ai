import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Api } from '../../services/api';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule // Add spinner module here
  ],
  templateUrl: './project-create.html',
  styleUrl: './project-create.scss'
})
export class ProjectCreate {
  projectForm: FormGroup;
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private apiService: Api,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      this.snackBar.open('Please correct the errors before submitting.', 'Close');
      return;
    }
    this.isLoading = true;
    const projectName = this.projectForm.value.name;
    this.apiService.createProject(projectName).subscribe({
      next: (project) => {
        this.isLoading = false;
        this.snackBar.open(`Project "${project.name}" created successfully!`, 'OK', { panelClass: 'snackbar-success' });
        this.router.navigate(['/projects', project.id]);
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open(`Error creating project: ${err.message}`, 'Close', { panelClass: 'snackbar-error' });
        console.error('Error creating project:', err);
      }
    });
  }
}
