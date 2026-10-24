import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { toApiError } from '../http/api-error';
import { API_BASE_URL, API_PREFIX } from '../http/api-url';
import { Film, FilmDetail } from '../interfaces/film.interface';
import { ListQuery } from '../interfaces/common/list-query.interface';
import { PageResponse } from '../interfaces/common/page-response.interface';
import { Person, PersonDetail } from '../interfaces/person.interface';
import { Starship, StarshipDetail } from '../interfaces/starship.interface';
import { Vehicle, VehicleDetail } from '../interfaces/vehicle.interface';

type Resource = 'people' | 'films' | 'starships' | 'vehicles';

/** Single entry point to the backend listings and detail endpoints. Errors surface as `ApiError`. */
@Injectable({ providedIn: 'root' })
export class StarWarsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getPeople(query: ListQuery): Observable<PageResponse<Person>> {
    return this.list<Person>('people', query);
  }

  getFilms(query: ListQuery): Observable<PageResponse<Film>> {
    return this.list<Film>('films', query);
  }

  getStarships(query: ListQuery): Observable<PageResponse<Starship>> {
    return this.list<Starship>('starships', query);
  }

  getVehicles(query: ListQuery): Observable<PageResponse<Vehicle>> {
    return this.list<Vehicle>('vehicles', query);
  }

  getPerson(id: string): Observable<PersonDetail> {
    return this.detail<PersonDetail>('people', id);
  }

  getFilm(id: string): Observable<FilmDetail> {
    return this.detail<FilmDetail>('films', id);
  }

  getStarship(id: string): Observable<StarshipDetail> {
    return this.detail<StarshipDetail>('starships', id);
  }

  getVehicle(id: string): Observable<VehicleDetail> {
    return this.detail<VehicleDetail>('vehicles', id);
  }

  private detail<T>(resource: Resource, id: string): Observable<T> {
    return this.http
      .get<T>(`${this.apiBaseUrl}${API_PREFIX}/${resource}/${encodeURIComponent(id)}`)
      .pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }

  private list<T>(resource: Resource, query: ListQuery): Observable<PageResponse<T>> {
    let params = new HttpParams().set('page', query.page);
    if (query.id) params = params.set('id', query.id);
    if (query.name) params = params.set('name', query.name);
    if (query.sort) params = params.set('sort', query.sort);

    return this.http
      .get<PageResponse<T>>(`${this.apiBaseUrl}${API_PREFIX}/${resource}`, { params })
      .pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }
}
