import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiError } from '../../../http/api-error';
import { ListStateComponent } from './list-state.component';

function error(kind: ApiError['kind'], message = 'boom'): ApiError {
  return { kind, status: 0, message, fieldErrors: [], retryAfterSeconds: null };
}

describe('ListStateComponent', () => {
  let fixture: ComponentFixture<ListStateComponent>;
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const button = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement | null;

  beforeEach(() => {
    fixture = TestBed.createComponent(ListStateComponent);
  });

  it('renders an accessible skeleton while loading', async () => {
    fixture.componentRef.setInput('mode', 'loading');
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="status"]')).not.toBeNull();
    expect(root.querySelectorAll('.animate-pulse')).toHaveLength(10);
    expect(text()).toContain('Loading results');
  });

  it('explains an empty collection without offering to clear filters', async () => {
    fixture.componentRef.setInput('mode', 'empty');
    fixture.componentRef.setInput('emptyReason', 'no-data');
    fixture.componentRef.setInput('entityLabel', 'starships');
    await fixture.whenStable();

    expect(text()).toContain('No starships available');
    expect(button()).toBeNull();
  });

  it('distinguishes "no matches" and lets the user clear the filters', async () => {
    const cleared = vi.fn();
    fixture.componentInstance.clearFilters.subscribe(cleared);
    fixture.componentRef.setInput('mode', 'empty');
    fixture.componentRef.setInput('emptyReason', 'no-matches');
    await fixture.whenStable();

    expect(text()).toContain('No matches found');
    button()?.click();
    expect(cleared).toHaveBeenCalledTimes(1);
  });

  it('explains an out of range page', async () => {
    fixture.componentRef.setInput('mode', 'empty');
    fixture.componentRef.setInput('emptyReason', 'out-of-range');
    await fixture.whenStable();
    expect(text()).toContain('Nothing on this page');
  });

  it('shows the error as an alert and allows retrying', async () => {
    const retried = vi.fn();
    fixture.componentInstance.retry.subscribe(retried);
    fixture.componentRef.setInput('mode', 'error');
    fixture.componentRef.setInput('error', error('network', 'Cannot reach the server.'));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(text()).toContain('Connection problem');
    expect(text()).toContain('Cannot reach the server.');
    button()?.click();
    expect(retried).toHaveBeenCalledTimes(1);
  });

  it('does not offer retry for a validation error', async () => {
    fixture.componentRef.setInput('mode', 'error');
    fixture.componentRef.setInput('error', error('validation', 'ID must be a positive integer.'));
    await fixture.whenStable();
    expect(button()).toBeNull();
  });
});
