import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EntityColumn, EntityTableComponent } from './entity-table.component';

const columns: EntityColumn[] = [
  { key: 'name', header: 'Name' },
  { key: 'id', header: 'ID' },
  { key: 'gender', header: 'Gender' },
];
const rows = [
  { id: '1', name: 'Luke Skywalker', gender: 'Male', crawl: 'Long ago\nin a galaxy' },
  { id: '2', name: 'Leia Organa', gender: '—', crawl: '—' },
];

describe('EntityTableComponent', () => {
  let fixture: ComponentFixture<EntityTableComponent>;
  const root = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(EntityTableComponent);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('caption', 'People list');
    await fixture.whenStable();
  });

  it('renders the declared columns as headers and one table row per record', () => {
    const headers = Array.from(root().querySelectorAll('thead th')).map((th) =>
      th.textContent?.trim(),
    );
    expect(headers).toEqual(['Name', 'ID', 'Gender']);
    expect(root().querySelectorAll('tbody tr')).toHaveLength(2);
    expect(root().querySelector('tbody tr th')?.textContent).toContain('Luke Skywalker');
  });

  it('exposes an accessible name for the table and the card list', () => {
    expect(root().querySelector('caption')?.textContent).toContain('People list');
    expect(root().querySelector('ul')?.getAttribute('aria-label')).toBe('People list');
  });

  it('renders a card per record for narrow screens', () => {
    expect(root().querySelectorAll('ul > li')).toHaveLength(2);
    expect(root().querySelector('ul > li h2')?.textContent).toContain('Luke Skywalker');
  });

  it('does not render the expandable section unless a detail key is set', () => {
    expect(root().querySelector('details')).toBeNull();
  });

  it('renders the detail only for rows that have one', async () => {
    fixture.componentRef.setInput('detailKey', 'crawl');
    fixture.componentRef.setInput('detailLabel', 'Opening crawl');
    await fixture.whenStable();

    // one in the table, one in the card list: only Luke has a crawl
    expect(root().querySelectorAll('details')).toHaveLength(2);
    expect(root().querySelector('details summary')?.textContent).toContain('Opening crawl');
  });

  it('marks the content busy and dimmed while a newer page loads', async () => {
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();
    const wrapper = root().firstElementChild as HTMLElement;
    expect(wrapper.getAttribute('aria-busy')).toBe('true');
    expect(wrapper.classList.contains('opacity-50')).toBe(true);
  });
});

describe('EntityTableComponent detail links', () => {
  let fixture: ComponentFixture<EntityTableComponent>;
  const root = () => fixture.nativeElement as HTMLElement;

  async function render(linkBase: string | null, params: Record<string, string> | null = null) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(EntityTableComponent);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('caption', 'People list');
    fixture.componentRef.setInput('linkBase', linkBase);
    fixture.componentRef.setInput('linkQueryParams', params);
    await fixture.whenStable();
  }

  it('makes the primary cell of every row a real link to its detail page', async () => {
    await render('/people');
    const tableLinks = Array.from(root().querySelectorAll('tbody th a'));
    expect(tableLinks.map((a) => a.getAttribute('href'))).toEqual(['/people/1', '/people/2']);
    expect(tableLinks[0].textContent).toContain('Luke Skywalker');
  });

  it('links the card titles too', async () => {
    await render('/people');
    const cardLinks = Array.from(root().querySelectorAll('ul > li h2 a'));
    expect(cardLinks.map((a) => a.getAttribute('href'))).toEqual(['/people/1', '/people/2']);
  });

  it('carries the list position in the back parameter', async () => {
    await render('/people', { back: 'page=2&name=luke' });
    expect(root().querySelector('tbody th a')?.getAttribute('href')).toBe(
      '/people/1?back=page%3D2%26name%3Dluke',
    );
  });

  it('renders plain text when no link base is given', async () => {
    await render(null);
    expect(root().querySelector('a')).toBeNull();
  });
});

describe('EntityTableComponent sorting', () => {
  let fixture: ComponentFixture<EntityTableComponent>;
  let emitted: (string | null)[];
  const root = () => fixture.nativeElement as HTMLElement;
  const sortableColumns: EntityColumn[] = [
    { key: 'name', header: 'Name', sortKey: 'name' },
    { key: 'id', header: 'ID' },
    { key: 'mass', header: 'Mass', sortKey: 'mass' },
  ];
  const header = (index: number) => root().querySelectorAll('thead th')[index];

  async function render(sort: string | null = null) {
    fixture = TestBed.createComponent(EntityTableComponent);
    emitted = [];
    fixture.componentInstance.sortChange.subscribe((value) => emitted.push(value));
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('columns', sortableColumns);
    fixture.componentRef.setInput('caption', 'People list');
    fixture.componentRef.setInput('sort', sort);
    await fixture.whenStable();
  }

  it('turns only sortable headers into buttons, with aria-sort none by default', async () => {
    await render();
    expect(header(0).querySelector('button')?.textContent).toContain('Name');
    expect(header(0).getAttribute('aria-sort')).toBe('none');
    expect(header(1).querySelector('button')).toBeNull();
    expect(header(1).hasAttribute('aria-sort')).toBe(false);
    expect(header(2).getAttribute('aria-sort')).toBe('none');
  });

  it('reflects the active sort in aria-sort and only on that column', async () => {
    await render('name');
    expect(header(0).getAttribute('aria-sort')).toBe('ascending');
    expect(header(2).getAttribute('aria-sort')).toBe('none');

    fixture.componentRef.setInput('sort', '-mass');
    await fixture.whenStable();
    expect(header(0).getAttribute('aria-sort')).toBe('none');
    expect(header(2).getAttribute('aria-sort')).toBe('descending');
  });

  it('shows a direction indicator for the active column', async () => {
    await render('-name');
    expect(header(0).querySelector('i.fa-sort-down')).not.toBeNull();
    await render('name');
    expect(header(0).querySelector('i.fa-sort-up')).not.toBeNull();
    await render();
    expect(header(0).querySelector('i.fa-sort')).not.toBeNull();
  });

  it('cycles none, ascending, descending, none on repeated clicks', async () => {
    await render();
    for (const current of [null, 'name', '-name']) {
      fixture.componentRef.setInput('sort', current);
      await fixture.whenStable();
      (header(0).querySelector('button') as HTMLButtonElement).click();
    }

    expect(emitted).toEqual(['name', '-name', null]);
  });

  it('starts ascending on a column when another one is sorted', async () => {
    await render('-name');
    (header(2).querySelector('button') as HTMLButtonElement).click();
    expect(emitted).toEqual(['mass']);
  });

  it('offers a labelled select with every sortable column and direction on cards', async () => {
    await render('-mass');
    const select = root().querySelector('select') as HTMLSelectElement;
    expect(root().querySelector(`label[for="${select.id}"]`)?.textContent).toContain('Sort by');
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual([
      'Default order',
      'Name (ascending)',
      'Name (descending)',
      'Mass (ascending)',
      'Mass (descending)',
    ]);
    expect(select.value).toBe('-mass');
  });

  it('emits the chosen option, and null for the default order', async () => {
    await render();
    const select = root().querySelector('select') as HTMLSelectElement;

    select.value = 'name';
    select.dispatchEvent(new Event('change'));
    select.value = '';
    select.dispatchEvent(new Event('change'));

    expect(emitted).toEqual(['name', null]);
  });

  it('renders no sorting controls when no column is sortable', async () => {
    fixture = TestBed.createComponent(EntityTableComponent);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('caption', 'People list');
    await fixture.whenStable();
    expect(root().querySelector('thead button')).toBeNull();
    expect(root().querySelector('select')).toBeNull();
  });
});
