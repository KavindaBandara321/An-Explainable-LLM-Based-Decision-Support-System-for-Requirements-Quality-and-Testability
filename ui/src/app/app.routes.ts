import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'analysis' },
  {
    path: 'analysis',
    title: 'Analysis · Story quality UI',
    loadComponent: () => import('./pages/analysis/analysis').then((m) => m.Analysis),
  },
  {
    path: 'improvement',
    title: 'Improvement · Story quality UI',
    loadComponent: () => import('./pages/improvement/improvement').then((m) => m.Improvement),
  },
  {
    path: 'study',
    title: 'User study · Story quality UI',
    loadComponent: () => import('./pages/study/study').then((m) => m.Study),
  },
  { path: '**', redirectTo: 'analysis' },
];
