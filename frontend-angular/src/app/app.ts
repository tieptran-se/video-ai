import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    RouterLink,   
    RouterLinkActive,
    MatIconModule
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  title = 'frontend-angular';
  currentYear = new Date().getFullYear();
}
