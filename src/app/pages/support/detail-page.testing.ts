import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_BASE_URL } from '../../http/api-url';

export interface DetailPageCase {
  name: string;
  /** Route segment, also the backend resource name. */
  route: string;
  listLabel: string;
  notFoundTitle: string;
  load: () => Promise<{ default: Type<unknown> }>;
  body: Record<string, unknown>;
  title: string;
  attributes: Record<string, string>;
  /** Related sections: heading -> hrefs expected inside it. */
  sections: Record<string, string[]>;
  /** Every related section the page renders. */
  allSections: string[];
}

/** Behavior shared by the four entity detail pages; each page spec supplies its own case. */
export function describeDetailPage(c: DetailPageCase): void {
  describe(`${c.name} detail page`, () => {
    let harness: RouterTestingHarness;
    let http: HttpTestingController;
    let api: string;

    const root = () => harness.fixture.nativeElement as HTMLElement;
    const url = (id: string) => `${api}/api/v1/${c.route}/${id}`;
    const heading = () => root().querySelector('h1');
    const link = (text: string) =>
      Array.from(root().querySelectorAll('a')).find((a) => a.textContent?.includes(text));
    const section = (name: string) =>
      Array.from(root().querySelectorAll('section')).find(
        (s) => s.querySelector('h2')?.textContent?.trim() === name,
      );

    async function open(path: string): Promise<void> {
      await harness.navigateByUrl(path);
    }

    async function flush(req: TestRequest, body: Record<string, unknown> = c.body): Promise<void> {
      req.flush(body);
      await harness.fixture.whenStable();
    }

    beforeEach(async () => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([{ path: `${c.route}/:id`, loadComponent: c.load }]),
          provideHttpClient(),
          provideHttpClientTesting(),
        ],
      });
      http = TestBed.inject(HttpTestingController);
      api = TestBed.inject(API_BASE_URL);
      harness = await RouterTestingHarness.create();
    });

    afterEach(() => http.verify());

    it('shows a loading skeleton marked busy until the data arrives', async () => {
      await open(`/${c.route}/1`);
      const req = http.expectOne(url('1'));
      expect(req.request.method).toBe('GET');
      expect(root().querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(root().querySelector('[role="status"]')).not.toBeNull();

      await flush(req);
      expect(root().querySelector('[aria-busy="true"]')).toBeNull();
    });

    it('renders the title as the page heading and every attribute', async () => {
      await open(`/${c.route}/1`);
      await flush(http.expectOne(url('1')));

      expect(heading()?.textContent?.trim()).toBe(c.title);
      expect(root().querySelectorAll('h1')).toHaveLength(1);
      const shown = new Map(
        Array.from(root().querySelectorAll('dl > div')).map((row) => [
          row.querySelector('dt')?.textContent?.trim(),
          row.querySelector('dd')?.textContent?.trim(),
        ]),
      );
      for (const [label, value] of Object.entries(c.attributes)) {
        expect(shown.get(label), label).toBe(value);
      }
    });

    it('moves the focus to the heading once the content is ready', async () => {
      await open(`/${c.route}/1`);
      await flush(http.expectOne(url('1')));
      expect(document.activeElement).toBe(heading());
    });

    it('lists related items as links to their own detail pages', async () => {
      await open(`/${c.route}/1`);
      await flush(http.expectOne(url('1')));

      for (const [name, hrefs] of Object.entries(c.sections)) {
        const links = Array.from(section(name)?.querySelectorAll('ul a') ?? []);
        expect(
          links.map((a) => a.getAttribute('href')),
          name,
        ).toEqual(hrefs);
      }
    });

    it('says "None recorded" for empty relations instead of failing', async () => {
      await open(`/${c.route}/1`);
      await flush(http.expectOne(url('1')), {
        ...c.body,
        films: [],
        characters: [],
        starships: [],
        vehicles: [],
      });

      for (const name of c.allSections) {
        const empty = section(name);
        expect(empty?.textContent, name).toContain('None recorded');
        expect(empty?.querySelector('ul')).toBeNull();
      }
      expect(root().querySelector('[role="alert"]')).toBeNull();
    });

    it('links back to the plain list when opened directly', async () => {
      await open(`/${c.route}/1`);
      await flush(http.expectOne(url('1')));
      expect(link(`Back to ${c.listLabel}`)?.getAttribute('href')).toBe(`/${c.route}`);
    });

    it('links back to the list keeping the page and filters it came from', async () => {
      await open(`/${c.route}/1?back=page%3D2%26name%3Dluke`);
      await flush(http.expectOne(url('1')));
      expect(link(`Back to ${c.listLabel}`)?.getAttribute('href')).toBe(
        `/${c.route}?page=2&name=luke`,
      );
    });

    it('links back to the list keeping the sort it came from', async () => {
      await open(`/${c.route}/1?back=page%3D2%26sort%3D-name`);
      await flush(http.expectOne(url('1')));
      expect(link(`Back to ${c.listLabel}`)?.getAttribute('href')).toBe(
        `/${c.route}?page=2&sort=-name`,
      );
    });

    it('ignores a tampered back parameter', async () => {
      await open(`/${c.route}/1?back=${encodeURIComponent('//evil.test&page=x')}`);
      await flush(http.expectOne(url('1')));
      expect(link(`Back to ${c.listLabel}`)?.getAttribute('href')).toBe(`/${c.route}`);
    });

    it('shows a not found view with a way back on 404', async () => {
      await open(`/${c.route}/999`);
      http
        .expectOne(url('999'))
        .flush({ title: 'Not Found' }, { status: 404, statusText: 'Not Found' });
      await harness.fixture.whenStable();

      expect(heading()?.textContent?.trim()).toBe(c.notFoundTitle);
      expect(link(`Back to ${c.listLabel}`)?.getAttribute('href')).toBe(`/${c.route}`);
      expect(root().textContent).not.toContain('Try again');
      expect(document.activeElement).toBe(heading());
    });

    it.each(['abc', '0', '-1', '1.5', '01'])(
      'treats the invalid id "%s" as not found without calling the backend',
      async (id) => {
        await open(`/${c.route}/${id}`);
        http.expectNone((r) => r.url.startsWith(`${api}/api/v1/`));

        expect(heading()?.textContent?.trim()).toBe(c.notFoundTitle);
        expect(link(`Back to ${c.listLabel}`)).toBeDefined();
      },
    );

    it('shows the shared error state and retries on demand', async () => {
      await open(`/${c.route}/1`);
      http.expectOne(url('1')).flush({}, { status: 502, statusText: 'Bad Gateway' });
      await harness.fixture.whenStable();

      expect(root().querySelector('[role="alert"]')?.textContent).toContain(
        'data provider is not responding',
      );
      expect(heading()?.textContent).not.toContain(c.title);

      const retry = Array.from(root().querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Try again'),
      );
      retry?.click();
      await harness.fixture.whenStable();
      await flush(http.expectOne(url('1')));

      expect(heading()?.textContent?.trim()).toBe(c.title);
      expect(root().querySelector('[role="alert"]')).toBeNull();
    });

    it('cancels the previous request when the id changes', async () => {
      await open(`/${c.route}/1`);
      const first = http.expectOne(url('1'));

      await open(`/${c.route}/2`);
      const second = http.expectOne(url('2'));
      expect(first.cancelled).toBe(true);

      await flush(second, { ...c.body, id: '2' });
      expect(heading()?.textContent?.trim()).toBe(c.title);
    });
  });
}
