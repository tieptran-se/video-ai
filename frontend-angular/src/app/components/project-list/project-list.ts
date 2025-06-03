import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink, Router } from '@angular/router';
import { Project } from '../../models/models';
import { Api } from '../../services/api';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule
  ],
  templateUrl: './project-list.html',
  styleUrl: './project-list.scss'
})
export class ProjectList implements OnInit {
projects: Project[] = [];
  isLoading: boolean = true;
  errorMessage: string | null = null;

  constructor(
    private apiService: Api,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.apiService.getProjects().subscribe({
      next: (data) => {
        this.projects = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.message;
        this.isLoading = false;
        this.snackBar.open(`Error loading projects: ${this.errorMessage}`, 'Close', { panelClass: 'snackbar-error' });
        console.error(err);
      }
    });
  }

  viewProject(projectId?: number): void {
    if (projectId) {
      this.router.navigate(['/projects', projectId]);
    }
  }

  navigateToCreateProject(): void {
    this.router.navigate(['/projects/new']);
  }
}
