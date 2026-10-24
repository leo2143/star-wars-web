import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { ApiError } from '../http/api-error';
import { API_BASE_URL } from '../http/api-url';
import { PageResponse } from '../interfaces/common/page-response.interface';
import { ListQuery } from '../interfaces/common/list-query.interface';
import { StarWarsService } from './star-wars.service';

const page: PageResponse<{ id: string }> = {
  count: 1,
  currentPage: 2,
  totalPages: 3,
  nextPage: 3,
  previousPage: 1,
  results: [{ id: '1' }],
};

describe('StarWarsService', () => {
  let service: StarWarsService;
  let controller: HttpTestingController;
  let api: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StarWarsService);
    controller = TestBed.inject(HttpTestingController);
    api = TestBed.inject(API_BASE_URL);
  });

  afterEach(() => controller.verify());

  const methods = [
    ['getPeople', 'people'],
    ['getFilms', 'films'],
    ['getStarships', 'starships'],
    ['getVehicles', 'vehicles'],
  ] as const;

  describe.each(methods)('%s', (method, resource) => {
    const call = (q: ListQuery): Observable<PageResponse<unknown>> =>
      service[method](q) as Observable<PageResponse<unknown>>;

    it('requests the page with GET and returns the typed response', () => {
      let result: PageResponse<unknown> | undefined;
      call({ page: 2, id: null, name: null, sort: null }).subscribe((r) => (result = r));

      const req = controller.expectOne((r) => r.url === `${api}/api/v1/${resource}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.has('id')).toBe(false);
      expect(req.request.params.has('name')).toBe(false);
      expect(req.request.params.has('sort')).toBe(false);
      req.flush(page);

      expect(result).toEqual(page);
    });

    it('sends id and name filters as encoded params', () => {
      const query: ListQuery = { page: 1, id: '14', name: 'a&b=c d', sort: null };
      call(query).subscribe();

      const req = controller.expectOne((r) => r.url === `${api}/api/v1/${resource}`);
      expect(req.request.params.get('id')).toBe('14');
      expect(req.request.params.get('name')).toBe('a&b=c d');
      expect(req.request.urlWithParams).toContain('name=a%26b=c%20d');
      req.flush(page);
    });

    it('sends sort only when there is one', () => {
      call({ page: 1, id: null, name: null, sort: '-name' }).subscribe();

      const req = controller.expectOne((r) => r.url === `${api}/api/v1/${resource}`);
      expect(req.request.params.get('sort')).toBe('-name');
      req.flush(page);
    });

    it('maps HTTP failures to an ApiError', () => {
      let error: ApiError | undefined;
      call({ page: 1, id: null, name: null, sort: null }).subscribe({
        error: (e: ApiError) => (error = e),
      });

      controller
        .expectOne((r) => r.url === `${api}/api/v1/${resource}`)
        .flush({ title: 'Bad Gateway' }, { status: 502, statusText: 'Bad Gateway' });

      expect(error?.kind).toBe('upstream');
      expect(error?.status).toBe(502);
    });
  });

  const detailMethods = [
    ['getPerson', 'people'],
    ['getFilm', 'films'],
    ['getStarship', 'starships'],
    ['getVehicle', 'vehicles'],
  ] as const;

  describe.each(detailMethods)('%s', (methodName, resource) => {
    const method = (id: string): Observable<unknown> =>
      (service[methodName] as (id: string) => Observable<unknown>)(id);

    it('requests the detail with GET and returns the typed response', () => {
      let result: unknown;
      method('14').subscribe((r) => (result = r));

      const req = controller.expectOne(`${api}/api/v1/${resource}/14`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toEqual([]);
      req.flush({ id: '14', films: [] });

      expect(result).toEqual({ id: '14', films: [] });
    });

    it('maps a 404 to a not-found ApiError', () => {
      let error: ApiError | undefined;
      method('999').subscribe({ error: (e: ApiError) => (error = e) });

      controller
        .expectOne(`${api}/api/v1/${resource}/999`)
        .flush({ title: 'Not Found' }, { status: 404, statusText: 'Not Found' });

      expect(error?.kind).toBe('not-found');
      expect(error?.status).toBe(404);
    });

    it('maps other failures to an ApiError', () => {
      let error: ApiError | undefined;
      method('1').subscribe({ error: (e: ApiError) => (error = e) });

      controller
        .expectOne(`${api}/api/v1/${resource}/1`)
        .flush({}, { status: 502, statusText: 'Bad Gateway' });

      expect(error?.kind).toBe('upstream');
    });

    it('encodes the id so it can never alter the path', () => {
      method('1/../2').subscribe();
      controller.expectOne(`${api}/api/v1/${resource}/1%2F..%2F2`).flush({});
    });
  });
});
