import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityFiltersComponent, FilterValues } from './entity-filters.component';

describe('EntityFiltersComponent', () => {
  let fixture: ComponentFixture<EntityFiltersComponent>;
  let searches: FilterValues[];
  let cleared: number;

  const root = () => fixture.nativeElement as HTMLElement;
  const input = (id: string) => root().querySelector(`#${id}`) as HTMLInputElement;

  async function type(id: string, value: string): Promise<void> {
    const el = input(id);
    el.value = value;
    el.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    root().querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(EntityFiltersComponent);
    searches = [];
    cleared = 0;
    fixture.componentInstance.search.subscribe((v) => searches.push(v));
    fixture.componentInstance.clear.subscribe(() => cleared++);
    await fixture.whenStable();
  });

  it('emits trimmed filters on submit', async () => {
    await type('filter-id', '14');
    await type('filter-name', '  luke ');
    await submit();
    expect(searches).toEqual([{ id: '14', name: 'luke' }]);
  });

  it('emits nulls for empty fields', async () => {
    await submit();
    expect(searches).toEqual([{ id: null, name: null }]);
  });

  it.each(['0', 'abc', '-3', '1.5'])('rejects the id "%s" without emitting', async (value) => {
    await type('filter-id', value);
    await submit();

    expect(searches).toHaveLength(0);
    expect(input('filter-id').getAttribute('aria-invalid')).toBe('true');
    expect(root().querySelector('#filter-id-error')?.textContent).toContain(
      'positive whole number',
    );
    expect(input('filter-id').getAttribute('aria-describedby')).toBe('filter-id-error');
  });

  it('rejects names longer than 100 characters', async () => {
    await type('filter-name', 'x'.repeat(101));
    await submit();
    expect(searches).toHaveLength(0);
    expect(root().querySelector('#filter-name-error')).not.toBeNull();
  });

  it('shows the applied filters and mirrors them in the inputs', async () => {
    fixture.componentRef.setInput('appliedId', '5');
    fixture.componentRef.setInput('appliedName', 'Falcon');
    await fixture.whenStable();

    expect(input('filter-id').value).toBe('5');
    expect(input('filter-name').value).toBe('Falcon');
    expect(root().textContent).toContain('Applied filters');
    expect(root().textContent).toContain('Name: Falcon');
  });

  it('uses the configured label for the name field', async () => {
    fixture.componentRef.setInput('nameLabel', 'Title');
    await fixture.whenStable();
    expect(root().querySelector('label[for="filter-name"]')?.textContent).toContain('Title');
  });

  it('clear resets the inputs and notifies the parent', async () => {
    await type('filter-id', '7');
    (
      Array.from(root().querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Clear'),
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(input('filter-id').value).toBe('');
    expect(cleared).toBe(1);
  });
});
