import { Routes } from '@angular/router';
import { ProjectList } from './components/project-list/project-list';
import { ProjectCreate } from './components/project-create/project-create';
import { ProjectView } from './components/project-view/project-view';
import { AllVideos } from './components/all-videos/all-videos';
import { PublicVideoView } from './components/public-video-view/public-video-view';
import { Layout } from './components/layout/layout';

export const appRoutes: Routes = [
  {
    path: '',
    component: Layout, // The admin layout now wraps all main routes
    children: [
      { path: '', redirectTo: 'projects', pathMatch: 'full' },
      { path: 'projects', component: ProjectList, title: 'Projects - Video Processor' },
      { path: 'projects/new', component: ProjectCreate, title: 'New Project - Video Processor' },
      { path: 'projects/:id', component: ProjectView, title: 'View Project - Video Processor' },
      { path: 'videos', component: AllVideos, title: 'All Videos - Video Processor' },
    ]
  },
  {
    path: 'public/video/:slug',
    component: PublicVideoView,
    title: 'View Video'
  },
  { path: '**', redirectTo: 'projects', pathMatch: 'full' }
];