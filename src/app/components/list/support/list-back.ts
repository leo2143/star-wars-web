import { Params, convertToParamMap } from '@angular/router';
import { ListQuery } from '../../../interfaces/common/list-query.interface';
import { parseListQuery } from './entity-list';

/**
 * Serializes the position of a listing (page, filters and sort) into the single `back` query param a
 * detail URL carries, so "Back to list" can return to it. Null for the plain first page.
 */
export function toBackParam(query: ListQuery): string | null {
  const params = new URLSearchParams();
  if (query.page > 1) params.set('page', String(query.page));
  if (query.id) params.set('id', query.id);
  if (query.name) params.set('name', query.name);
  if (query.sort) params.set('sort', query.sort);
  return params.toString() || null;
}

/**
 * Rebuilds list query params from a `back` value. Only `page`, `id`, `name` and `sort` are read and they
 * go through the same validation as the list URL, so a tampered value degrades to the plain list.
 */
export function parseBackParam(raw: string | null): Params {
  if (!raw) return {};
  const source = new URLSearchParams(raw);
  const present: Record<string, string> = {};
  for (const key of ['page', 'id', 'name', 'sort']) {
    const value = source.get(key);
    if (value !== null) present[key] = value;
  }
  const { query, problem } = parseListQuery(convertToParamMap(present));
  if (problem) return {};
  return {
    page: query.page > 1 ? query.page : null,
    id: query.id,
    name: query.name,
    sort: query.sort,
  };
}
