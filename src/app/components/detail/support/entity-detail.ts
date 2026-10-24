import { Signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { ApiError } from '../../../http/api-error';
import { ID_PATTERN } from '../../../interfaces/common/list-query.interface';
import { parseBackParam } from '../../list/support/list-back';

export type DetailState<T> =
  { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: ApiError };

export interface EntityDetail<T> {
  state: Signal<DetailState<T>>;
  /** The loaded entity, or null while loading or after an error. */
  data: Signal<T | null>;
  /** Query params that take "Back to list" to the page and filters the user came from. */
  backQueryParams: Signal<Params>;
  retry(): void;
}

function invalidId(): ApiError {
  return {
    kind: 'not-found',
    status: 404,
    message: 'That is not a valid ID.',
    fieldErrors: [],
    retryAfterSeconds: null,
  };
}

/**
 * Binds a detail page to the `:id` route param. A malformed id never reaches the backend, and
 * `switchMap` cancels the request in flight when the id changes (cross-links between details).
 *
 * Must be called from an injection context (a component field initializer).
 */
export function createEntityDetail<T>(fetch: (id: string) => Observable<T>): EntityDetail<T> {
  const route = inject(ActivatedRoute);
  const retryRequested = new Subject<void>();

  const state = toSignal(
    combineLatest([
      route.paramMap.pipe(map((params) => params.get('id') ?? '')),
      retryRequested.pipe(startWith(undefined)),
    ]).pipe(
      switchMap(([id]): Observable<DetailState<T>> => {
        if (!ID_PATTERN.test(id)) {
          return of({ status: 'error', error: invalidId() });
        }
        return fetch(id).pipe(
          map((data): DetailState<T> => ({ status: 'success', data })),
          catchError((error: ApiError) => of<DetailState<T>>({ status: 'error', error })),
          startWith<DetailState<T>>({ status: 'loading' }),
        );
      }),
    ),
    { requireSync: true },
  );

  const back = toSignal(route.queryParamMap.pipe(map((params) => params.get('back'))), {
    initialValue: route.snapshot.queryParamMap.get('back'),
  });

  return {
    state,
    data: computed(() => {
      const current = state();
      return current.status === 'success' ? current.data : null;
    }),
    backQueryParams: computed(() => parseBackParam(back())),
    retry: () => retryRequested.next(),
  };
}
