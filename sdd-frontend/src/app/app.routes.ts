import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/grid-models/grid-models').then((m) => m.GridModelsComponent),
    title: 'Сеть — модели электрической сети',
  },
];
