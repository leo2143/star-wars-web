import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { PageResponse } from '../../interfaces/common/page-response.interface';
import { StarWarsService } from '../../services/star-wars.service';

export interface ListPageCase {
  name: string;
  href: string;
  component: Type<unknown>;
  method: string;
  item: Record<string, unknown>;
  headers: readonly string[];
  cells: readonly string[];
  sortable: readonly string[];
  /** Backend sort field and the header label that must be marked as sorted. */
  sortBy: readonly [field: string, header: string];
}

function page(results: unknown[]): PageResponse<unknown> {
  return {
    count: results.length,
    currentPage: 1,
    totalPages: 1,
    nextPage: null,
    previousPage: null,
    results,
  };
}

/** Behavior shared by the four entity list pages; each page spec supplies its own case. */
export function describeListPage({
  name,
  component,
  method,
  item,
  headers,
  cells,
  href,
  sortable,
  sortBy,
}: ListPageCase): void {
  describe(`${name} page`, () => {
    it('requests the first page and renders the entity columns', async () => {
      const fetch = vi.fn(() => of(page([item])));
      TestBed.configureTestingModule({
        providers: [provideRouter([]), { provide: StarWarsService, useValue: { [method]: fetch } }],
      });
      const fixture = TestBed.createComponent(component);
      await fixture.whenStable();

      expect(fetch).toHaveBeenCalledWith({ page: 1, id: null, name: null, sort: null });
      const root = fixture.nativeElement as HTMLElement;
      const shownHeaders = Array.from(root.querySelectorAll('thead th')).map((th) =>
        th.textContent?.trim(),
      );
      expect(shownHeaders).toEqual([...headers]);
      const shownCells = Array.from(root.querySelectorAll('tbody tr:first-child > *')).map((c) =>
        c.textContent?.trim(),
      );
      expect(shownCells).toEqual([...cells]);
    });

    it('makes only the sortable columns clickable', async () => {
      const fetch = vi.fn(() => of(page([item])));
      TestBed.configureTestingModule({
        providers: [provideRouter([]), { provide: StarWarsService, useValue: { [method]: fetch } }],
      });
      const fixture = TestBed.createComponent(component);
      await fixture.whenStable();

      const root = fixture.nativeElement as HTMLElement;
      const buttons = Array.from(root.querySelectorAll('thead th button')).map((b) =>
        b.textContent?.trim(),
      );
      expect(buttons).toEqual([...sortable]);
    });

    it('sends the backend field name of the sort in the URL and marks its column', async () => {
      const fetch = vi.fn(() => of(page([item])));
      TestBed.configureTestingModule({
        providers: [
          provideRouter([{ path: 'list', component }]),
          { provide: StarWarsService, useValue: { [method]: fetch } },
        ],
      });
      const [field, header] = sortBy;
      const harness = await RouterTestingHarness.create('/list?sort=-' + field);

      expect(fetch).toHaveBeenCalledWith({ page: 1, id: null, name: null, sort: '-' + field });
      const root = harness.fixture.nativeElement as HTMLElement;
      const sorted = Array.from(root.querySelectorAll('thead th')).find(
        (th) => th.getAttribute('aria-sort') === 'descending',
      );
      expect(sorted?.textContent?.trim()).toBe(header);
    });

    it('links the first cell of every row and card to the detail page', async () => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          { provide: StarWarsService, useValue: { [method]: () => of(page([item])) } },
        ],
      });
      const fixture = TestBed.createComponent(component);
      await fixture.whenStable();

      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('tbody tr:first-child th a')?.getAttribute('href')).toBe(href);
      expect(root.querySelector('ul > li h2 a')?.getAttribute('href')).toBe(href);
    });
  });
}
