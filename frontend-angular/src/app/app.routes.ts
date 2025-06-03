import { Routes } from '@angular/router';
import { ProjectList } from './components/project-list/project-list';
import { ProjectCreate } from './components/project-create/project-create';
import { ProjectView } from './components/project-view/project-view';

export const appRoutes: Routes = [
  { path: '', redirectTo: '/projects', pathMatch: 'full' },
  { path: 'projects', component: ProjectList, title: 'Projects - Video Processor' },
  { path: 'projects/new', component: ProjectCreate, title: 'New Project - Video Processor' },
  { path: 'projects/:id', component: ProjectView, title: 'View Project - Video Processor' }
];