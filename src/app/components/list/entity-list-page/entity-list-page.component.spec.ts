import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ApiError } from '../../../http/api-error';
import { EntityRow } from '../../../interfaces/common/entity-row.interface';
import { ListQuery } from '../../../interfaces/common/list-query.interface';
import { PageResponse } from '../../../interfaces/common/page-response.interface';
import { EntityList, ListState } from '../support/entity-list';
import { EntityListPageComponent } from './entity-list-page.component';

function page(
  rows: EntityRow[],
  extra: Partial<PageResponse<EntityRow>> = {},
): PageResponse<EntityRow> {
  return {
    count: rows.length,
    currentPage: 1,
    totalPages: 1,
    nextPage: null,
    previousPage: null,
    results: rows,
    ...extra,
  };
}

describe('EntityListPageComponent', () => {
  let fixture: ComponentFixture<EntityListPageComponent>;
  let state: ReturnType<typeof signal<ListState<EntityRow>>>;
  let query: ReturnType<typeof signal<ListQuery>>;
  let retry: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;

  const root = () => fixture.nativeElement as HTMLElement;

  async function render(
    initial: ListState<EntityRow>,
    q: ListQuery = { page: 1, id: null, name: null, sort: null },
  ) {
    state = signal(initial);
    query = signal(q);
    retry = vi.fn();
    const list: EntityList<EntityRow> = { state, query, retry } as unknown as EntityList<EntityRow>;

    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(EntityListPageComponent);
    fixture.componentRef.setInput('title', 'People');
    fixture.componentRef.setInput('entityLabel', 'people');
    fixture.componentRef.setInput('columns', [
      { key: 'name', header: 'Name', sortKey: 'name' },
      { key: 'id', header: 'ID' },
    ]);
    fixture.componentRef.setInput('list', list);
    await fixture.whenStable();
  }

  const clickButton = async (label: string) => {
    const button = Array.from(root().querySelectorAll('button')).find((b) =>
      b.textContent?.includes(label),
    );
    button?.click();
    await fixture.whenStable();
  };

  it('shows the loading skeleton on the first load', async () => {
    await render({ status: 'loading', previous: null });
    expect(root().querySelector('[aria-label="Loading results"]')).not.toBeNull();
    expect(root().querySelector('table')).toBeNull();
  });

  it('shows the table, the result count and the pagination on success', async () => {
    await render({
      status: 'success',
      page: page([{ id: '1', name: 'Luke' }], { count: 82, totalPages: 9, nextPage: 2 }),
    });
    expect(root().querySelectorAll('tbody tr')).toHaveLength(1);
    expect(root().textContent).toContain('82');
    expect(root().querySelector('app-pagination')).not.toBeNull();
  });

  it('keeps the previous rows (dimmed) while the next page loads', async () => {
    await render({
      status: 'loading',
      previous: page([{ id: '1', name: 'Luke' }], { count: 20, totalPages: 2, nextPage: 2 }),
    });
    expect(root().querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(root().querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('tells "no data" apart from "no matches"', async () => {
    await render({ status: 'success', page: page([], { count: 0 }) });
    expect(root().textContent).toContain('No people available');

    TestBed.resetTestingModule();
    await render(
      { status: 'success', page: page([], { count: 0 }) },
      { page: 1, id: null, name: 'zzz', sort: null },
    );
    expect(root().textContent).toContain('No matches found');
  });

  it('explains an out of range page and keeps the way back', async () => {
    await render({
      status: 'success',
      page: page([], { count: 25, currentPage: 9, totalPages: 3, previousPage: 3 }),
    });
    expect(root().textContent).toContain('Nothing on this page');
    expect(root().querySelector('app-pagination')).not.toBeNull();
  });

  it('shows errors, never an empty list, and retries on demand', async () => {
    const error: ApiError = {
      kind: 'upstream',
      status: 502,
      message: 'Provider down',
      fieldErrors: [],
      retryAfterSeconds: null,
    };
    await render({ status: 'error', error });

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Provider down');
    expect(root().querySelector('table')).toBeNull();
    await clickButton('Try again');
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('clearing filters navigates to page 1 without filters', async () => {
    await render(
      { status: 'success', page: page([], { count: 0 }) },
      { page: 3, id: null, name: 'zzz', sort: null },
    );
    await clickButton('Clear filters');
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { page: null, id: null, name: null, sort: null } }),
    );
  });

  it('paginating keeps the applied filters', async () => {
    await render(
      {
        status: 'success',
        page: page([{ id: '1', name: 'Luke' }], { count: 20, totalPages: 2, nextPage: 2 }),
      },
      { page: 1, id: null, name: 'sky', sort: null },
    );
    await clickButton('Next');
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { page: 2, id: null, name: 'sky', sort: null } }),
    );
  });

  it('applying a new search resets the page to 1', async () => {
    await render(
      { status: 'success', page: page([{ id: '1', name: 'Luke' }]) },
      { page: 4, id: null, name: null, sort: null },
    );
    const name = root().querySelector('#filter-name') as HTMLInputElement;
    name.value = 'leia';
    name.dispatchEvent(new Event('input'));
    root().querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { page: null, id: null, name: 'leia', sort: null } }),
    );
  });

  it('links rows to their detail keeping page and filters in the back parameter', async () => {
    await render(
      { status: 'success', page: page([{ id: '1', name: 'Luke' }]) },
      { page: 3, id: null, name: 'sky', sort: null },
    );
    fixture.componentRef.setInput('detailPath', '/people');
    await fixture.whenStable();

    expect(root().querySelector('tbody th a')?.getAttribute('href')).toBe(
      '/people/1?back=page%3D3%26name%3Dsky',
    );
  });

  it('adds no back parameter for the plain first page', async () => {
    await render({ status: 'success', page: page([{ id: '1', name: 'Luke' }]) });
    fixture.componentRef.setInput('detailPath', '/people');
    await fixture.whenStable();

    expect(root().querySelector('tbody th a')?.getAttribute('href')).toBe('/people/1');
  });

  describe('sorting', () => {
    const rowsPage = () => ({
      status: 'success' as const,
      page: page([{ id: '1', name: 'Luke' }], { count: 20, totalPages: 2, nextPage: 2 }),
    });

    it('passes the applied sort to the table', async () => {
      await render(rowsPage(), { page: 1, id: null, name: null, sort: '-name' });
      expect(root().querySelector('thead th')?.getAttribute('aria-sort')).toBe('descending');
    });

    it('sorting goes back to page 1 and keeps the filters', async () => {
      await render(rowsPage(), { page: 4, id: '3', name: 'sky', sort: null });
      (root().querySelector('thead th button') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { page: null, id: '3', name: 'sky', sort: 'name' },
        }),
      );
    });

    it('paginating and searching keep the sort', async () => {
      await render(rowsPage(), { page: 1, id: null, name: null, sort: '-name' });
      await clickButton('Next');
      expect(navigate).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({ queryParams: { page: 2, id: null, name: null, sort: '-name' } }),
      );

      const name = root().querySelector('#filter-name') as HTMLInputElement;
      name.value = 'leia';
      name.dispatchEvent(new Event('input'));
      root().querySelector('form')?.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      expect(navigate).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({
          queryParams: { page: null, id: null, name: 'leia', sort: '-name' },
        }),
      );
    });

    it('carries the sort in the back parameter of the detail links', async () => {
      await render(rowsPage(), { page: 2, id: null, name: null, sort: '-name' });
      fixture.componentRef.setInput('detailPath', '/people');
      await fixture.whenStable();

      expect(root().querySelector('tbody th a')?.getAttribute('href')).toBe(
        '/people/1?back=page%3D2%26sort%3D-name',
      );
    });
  });
});
