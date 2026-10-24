import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let fixture: ComponentFixture<PaginationComponent>;
  const buttons = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
  const previous = () => buttons()[0];
  const next = () => buttons()[1];

  async function render(inputs: Record<string, unknown>): Promise<void> {
    fixture = TestBed.createComponent(PaginationComponent);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    await fixture.whenStable();
  }

  it('shows the current page and the total from the backend metadata', async () => {
    await render({ currentPage: 2, totalPages: 9, count: 82, nextPage: 3, previousPage: 1 });
    expect(fixture.nativeElement.textContent).toMatch(/Page\s*2\s*of\s*9/);
    expect(fixture.nativeElement.textContent).toContain('82 results');
  });

  it('disables previous on the first page and emits the next page number', async () => {
    await render({ currentPage: 1, totalPages: 3, count: 25, nextPage: 2, previousPage: null });
    const emitted: number[] = [];
    fixture.componentInstance.pageChange.subscribe((page) => emitted.push(page));

    expect(previous().disabled).toBe(true);
    expect(next().disabled).toBe(false);
    next().click();
    expect(emitted).toEqual([2]);
  });

  it('disables next on the last page and emits the previous page number', async () => {
    await render({ currentPage: 3, totalPages: 3, count: 25, nextPage: null, previousPage: 2 });
    const emitted: number[] = [];
    fixture.componentInstance.pageChange.subscribe((page) => emitted.push(page));

    expect(next().disabled).toBe(true);
    previous().click();
    expect(emitted).toEqual([2]);
  });

  it('disables both buttons while busy', async () => {
    await render({
      currentPage: 2,
      totalPages: 3,
      count: 25,
      nextPage: 3,
      previousPage: 1,
      busy: true,
    });
    expect(previous().disabled).toBe(true);
    expect(next().disabled).toBe(true);
  });

  it('uses singular wording for one result', async () => {
    await render({ currentPage: 1, totalPages: 1, count: 1 });
    expect(fixture.nativeElement.textContent).toContain('1 result');
    expect(fixture.nativeElement.textContent).not.toContain('1 results');
  });
});
