import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth/guard/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · Star Wars',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/pages/login/login.component'),
  },
  {
    path: 'register',
    title: 'Create account · Star Wars',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/pages/register/register.component'),
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () => import('./components/layout/shell/shell.component'),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · Star Wars',
        loadComponent: () => import('./pages/dashboard/dashboard.component'),
      },
      {
        path: 'people',
        title: 'People · Star Wars',
        loadComponent: () => import('./pages/people/people-list/people.component'),
      },
      {
        path: 'people/:id',
        title: 'Person · Star Wars',
        loadComponent: () => import('./pages/people/person-detail/person-detail.component'),
      },
      {
        path: 'films',
        title: 'Films · Star Wars',
        loadComponent: () => import('./pages/films/films-list/films.component'),
      },
      {
        path: 'films/:id',
        title: 'Film · Star Wars',
        loadComponent: () => import('./pages/films/film-detail/film-detail.component'),
      },
      {
        path: 'starships',
        title: 'Starships · Star Wars',
        loadComponent: () => import('./pages/starships/starships-list/starships.component'),
      },
      {
        path: 'starships/:id',
        title: 'Starship · Star Wars',
        loadComponent: () => import('./pages/starships/starship-detail/starship-detail.component'),
      },
      {
        path: 'vehicles',
        title: 'Vehicles · Star Wars',
        loadComponent: () => import('./pages/vehicles/vehicles-list/vehicles.component'),
      },
      {
        path: 'vehicles/:id',
        title: 'Vehicle · Star Wars',
        loadComponent: () => import('./pages/vehicles/vehicle-detail/vehicle-detail.component'),
      },
    ],
  },
  // Unknown URLs go to the dashboard; the guard sends anonymous users to the login first.
  { path: '**', redirectTo: '/dashboard' },
];
