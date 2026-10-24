import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Observable, Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../http/api-error';
import { ListQuery } from '../../../interfaces/common/list-query.interface';
import { PageResponse } from '../../../interfaces/common/page-response.interface';
import { createEntityList, parseListQuery } from './entity-list';

const apiError: ApiError = {
  kind: 'upstream',
  status: 502,
  message: 'down',
  fieldErrors: [],
  retryAfterSeconds: null,
};

function pageOf(...names: string[]): PageResponse<{ name: string }> {
  return {
    count: names.length,
    currentPage: 1,
    totalPages: 1,
    nextPage: null,
    previousPage: null,
    results: names.map((name) => ({ name })),
  };
}

describe('parseListQuery', () => {
  const parse = (params: Record<string, string>) => parseListQuery(convertToParamMap(params));

  it('defaults to the first page without filters', () => {
    expect(parse({})).toEqual({
      query: { page: 1, id: null, name: null, sort: null },
      problem: null,
    });
  });

  it('reads page, id and a trimmed name', () => {
    expect(parse({ page: '3', id: '14', name: '  luke ' }).query).toEqual({
      page: 3,
      id: '14',
      name: 'luke',
      sort: null,
    });
  });

  it('treats a blank name as no filter', () => {
    expect(parse({ name: '   ' }).query.name).toBeNull();
  });

  it.each([
    [{ page: '0' }, 'Page'],
    [{ page: 'abc' }, 'Page'],
    [{ page: '-1' }, 'Page'],
    [{ id: '0' }, 'ID'],
    [{ id: '1.5' }, 'ID'],
    [{ id: 'abc' }, 'ID'],
    [{ name: 'x'.repeat(101) }, 'Name'],
  ])('flags %j as invalid', (params, subject) => {
    expect(parse(params).problem).toContain(subject);
  });
});

describe('parseListQuery sort', () => {
  const allowed = ['name', 'mass'];
  const sortOf = (sort: string, keys?: readonly string[]) =>
    parseListQuery(convertToParamMap({ sort }), keys);

  it('reads ascending and descending sorts of an allowed field', () => {
    expect(sortOf('name', allowed).query.sort).toBe('name');
    expect(sortOf('-mass', allowed).query.sort).toBe('-mass');
  });

  it.each(['height', '-height', '--name', 'name,mass', 'na me', '', '-', 'name1'])(
    'ignores the sort "%s" without reporting a problem',
    (sort) => {
      const parsed = sortOf(sort, allowed);
      expect(parsed.query.sort).toBeNull();
      expect(parsed.problem).toBeNull();
    },
  );

  it('ignores a sort when the page declares no sortable fields', () => {
    expect(sortOf('name', []).query.sort).toBeNull();
  });

  it('accepts any well-formed sort when the allowed fields are unknown (back link)', () => {
    expect(sortOf('-anything').query.sort).toBe('-anything');
    expect(sortOf('x'.repeat(51)).query.sort).toBeNull();
  });

  it('keeps the rest of the query when the sort is ignored', () => {
    const parsed = parseListQuery(convertToParamMap({ page: '2', sort: 'bad!' }), allowed);
    expect(parsed.query).toEqual({ page: 2, id: null, name: null, sort: null });
  });
});

describe('createEntityList', () => {
  let params$: BehaviorSubject<ParamMap>;

  function setup(fetch: (q: ListQuery) => Observable<PageResponse<{ name: string }>>) {
    params$ = new BehaviorSubject(convertToParamMap({}));
    TestBed.configureTestingModule({
      providers: [{ provide: ActivatedRoute, useValue: { queryParamMap: params$ } }],
    });
    return runInInjectionContext(TestBed.inject(EnvironmentInjector), () =>
      createEntityList(fetch, (item: { name: string }) => ({ label: item.name }), ['name']),
    );
  }

  it('maps results to rows when the request succeeds', () => {
    const list = setup(() => of(pageOf('Luke')));
    expect(list.state()).toEqual({
      status: 'success',
      page: { ...pageOf('Luke'), results: [{ label: 'Luke' }] },
    });
  });

  it('is loading while the request is in flight and reports the parsed query', () => {
    const pending = new Subject<PageResponse<{ name: string }>>();
    const fetch = vi.fn(() => pending);
    const list = setup(fetch);
    params$.next(convertToParamMap({ page: '2', name: 'leia' }));

    expect(list.state().status).toBe('loading');
    expect(list.query()).toEqual({ page: 2, id: null, name: 'leia', sort: null });
    expect(fetch).toHaveBeenLastCalledWith({ page: 2, id: null, name: 'leia', sort: null });
  });

  it('ignores a stale response when a newer query was issued', () => {
    const first = new Subject<PageResponse<{ name: string }>>();
    const second = new Subject<PageResponse<{ name: string }>>();
    const responses = [first, second];
    const list = setup(() => responses.shift()!);

    params$.next(convertToParamMap({ name: 'new' }));
    second.next(pageOf('Newest'));
    first.next(pageOf('Stale'));

    const state = list.state();
    expect(state.status).toBe('success');
    expect(state.status === 'success' && state.page.results).toEqual([{ label: 'Newest' }]);
  });

  it('exposes the ApiError when the request fails', () => {
    const list = setup(() => throwError(() => apiError));
    expect(list.state()).toEqual({ status: 'error', error: apiError });
  });

  it('does not call the backend for invalid URL values and reports a validation error', () => {
    const fetch = vi.fn(() => of(pageOf()));
    const list = setup(fetch);
    fetch.mockClear();

    params$.next(convertToParamMap({ id: 'abc' }));

    expect(fetch).not.toHaveBeenCalled();
    const state = list.state();
    expect(state.status === 'error' && state.error.kind).toBe('validation');
  });

  it('retry() repeats the last query', () => {
    const fetch = vi.fn(() => of(pageOf('A')));
    const list = setup(fetch);
    fetch.mockClear();

    list.retry();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('passes the sort of the URL to the request', () => {
    const fetch = vi.fn(() => of(pageOf('A')));
    const list = setup(fetch);

    params$.next(convertToParamMap({ sort: '-name' }));

    expect(fetch).toHaveBeenLastCalledWith({ page: 1, id: null, name: null, sort: '-name' });
    expect(list.query().sort).toBe('-name');
  });

  it('keeps the previous rows while paging with the same filters, not after changing them', () => {
    const pending = new Subject<PageResponse<{ name: string }>>();
    let call = 0;
    const list = setup(() => (call++ === 0 ? of(pageOf('A')) : pending));

    params$.next(convertToParamMap({ page: '2' }));
    let state = list.state();
    expect(state.status === 'loading' && state.previous?.results).toEqual([{ label: 'A' }]);

    params$.next(convertToParamMap({ page: '2', name: 'x' }));
    state = list.state();
    expect(state.status === 'loading' && state.previous).toBeNull();
  });

  it('keeps the previous rows when only the page changes under the same sort, not when the sort changes', () => {
    const pending = new Subject<PageResponse<{ name: string }>>();
    let call = 0;
    const list = setup(() => (call++ === 0 ? of(pageOf('A')) : pending));
    params$.next(convertToParamMap({ sort: 'name' }));
    pending.next(pageOf('B'));

    params$.next(convertToParamMap({ sort: 'name', page: '2' }));
    let state = list.state();
    expect(state.status === 'loading' && state.previous?.results).toEqual([{ label: 'B' }]);

    params$.next(convertToParamMap({ sort: '-name', page: '2' }));
    state = list.state();
    expect(state.status === 'loading' && state.previous).toBeNull();
  });
});
