import { Signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { ApiError } from '../../../http/api-error';
import {
  ID_PATTERN,
  ListQuery,
  NAME_MAX_LENGTH,
} from '../../../interfaces/common/list-query.interface';
import { PageResponse } from '../../../interfaces/common/page-response.interface';

export type ListState<R> =
  | { status: 'loading'; previous: PageResponse<R> | null }
  | { status: 'success'; page: PageResponse<R> }
  | { status: 'error'; error: ApiError };

export interface EntityList<R> {
  /** Query currently reflected in the URL. */
  query: Signal<ListQuery>;
  state: Signal<ListState<R>>;
  retry(): void;
}

export interface ParsedListQuery {
  query: ListQuery;
  /** Human readable reason when the URL holds a value the backend would reject. */
  problem: string | null;
}

const PAGE_PATTERN = /^[1-9]\d{0,5}$/;

/** Same shape the backend accepts: an optional `-` followed by a field name. */
const SORT_PATTERN = /^(?=.{1,50}$)-?[a-zA-Z]+$/;

/** Sort keys of the columns that can be sorted. */
export function sortKeysOf(columns: readonly { sortKey?: string }[]): string[] {
  return columns.flatMap((column) => (column.sortKey ? [column.sortKey] : []));
}

/**
 * Reads `page`, `id`, `name` and `sort` from the URL and validates them before any request is made.
 * A `sort` that is malformed or not one of `sortKeys` is ignored, not reported. Without `sortKeys`
 * (the back link of a detail page, which does not know the list) only the format is checked.
 */
export function parseListQuery(params: ParamMap, sortKeys?: readonly string[]): ParsedListQuery {
  const rawPage = params.get('page');
  const rawId = params.get('id')?.trim() || null;
  const rawName = params.get('name')?.trim() || null;
  const rawSort = params.get('sort');
  const sort =
    rawSort !== null &&
    SORT_PATTERN.test(rawSort) &&
    (!sortKeys || sortKeys.includes(rawSort.replace(/^-/, '')))
      ? rawSort
      : null;

  let problem: string | null = null;
  if (rawPage !== null && !PAGE_PATTERN.test(rawPage)) problem = 'Page must be a positive integer.';
  else if (rawId !== null && !ID_PATTERN.test(rawId)) problem = 'ID must be a positive integer.';
  else if (rawName !== null && rawName.length > NAME_MAX_LENGTH) {
    problem = `Name must be at most ${NAME_MAX_LENGTH} characters.`;
  }

  return {
    query: {
      page: rawPage !== null && !problem ? Number(rawPage) : 1,
      id: rawId,
      name: rawName,
      sort,
    },
    problem,
  };
}

function validationError(message: string): ApiError {
  return { kind: 'validation', status: 400, message, fieldErrors: [], retryAfterSeconds: null };
}

/**
 * Binds a listing to the URL: the query string is the single source of truth, every change
 * issues a request and `switchMap` drops the answer of any superseded request.
 *
 * Must be called from an injection context (a component field initializer).
 */
export function createEntityList<T, R>(
  fetch: (query: ListQuery) => Observable<PageResponse<T>>,
  toRow: (item: T) => R,
  sortKeys: readonly string[],
): EntityList<R> {
  const route = inject(ActivatedRoute);
  const retryRequested = new Subject<void>();
  let lastSuccess: { filters: string; page: PageResponse<R> } | null = null;

  const view = toSignal(
    combineLatest([
      route.queryParamMap.pipe(map((params) => parseListQuery(params, sortKeys))),
      retryRequested.pipe(startWith(undefined)),
    ]).pipe(
      switchMap(([{ query, problem }]): Observable<{ query: ListQuery; state: ListState<R> }> => {
        if (problem) {
          return of({ query, state: { status: 'error', error: validationError(problem) } });
        }
        const filters = `${query.id ?? ''}|${query.name ?? ''}|${query.sort ?? ''}`;
        const previous = lastSuccess?.filters === filters ? lastSuccess.page : null;

        return fetch(query).pipe(
          map((page): PageResponse<R> => ({ ...page, results: page.results.map(toRow) })),
          tap((page) => (lastSuccess = { filters, page })),
          map((page): ListState<R> => ({ status: 'success', page })),
          catchError((error: ApiError) => {
            lastSuccess = null;
            return of<ListState<R>>({ status: 'error', error });
          }),
          startWith<ListState<R>>({ status: 'loading', previous }),
          map((state) => ({ query, state })),
        );
      }),
    ),
    { requireSync: true },
  );

  return {
    query: computed(() => view().query),
    state: computed(() => view().state),
    retry: () => retryRequested.next(),
  };
}
