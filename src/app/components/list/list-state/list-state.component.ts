import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ApiError } from '../../../http/api-error';

export type EmptyReason = 'no-data' | 'no-matches' | 'out-of-range';

const SKELETON_ROWS = 10;

/** Loading skeleton, empty state and error state of a listing, sharing one stable frame. */
@Component({
  selector: 'app-list-state',
  templateUrl: './list-state.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListStateComponent {
  readonly mode = input.required<'loading' | 'empty' | 'error'>();
  readonly emptyReason = input<EmptyReason>('no-data');
  readonly error = input<ApiError | null>(null);
  readonly entityLabel = input('records');

  readonly clearFilters = output<void>();
  readonly retry = output<void>();

  protected readonly rows = Array.from({ length: SKELETON_ROWS }, (_, i) => i);

  protected readonly emptyTitle = computed(() => {
    switch (this.emptyReason()) {
      case 'no-matches':
        return 'No matches found';
      case 'out-of-range':
        return 'Nothing on this page';
      default:
        return `No ${this.entityLabel()} available`;
    }
  });

  protected readonly emptyText = computed(() => {
    switch (this.emptyReason()) {
      case 'no-matches':
        return 'No results match the filters you applied. Try a different ID or name, or clear the filters.';
      case 'out-of-range':
        return 'This page is beyond the last page of results. Use the pagination controls to go back.';
      default:
        return 'The archive returned no records for this category.';
    }
  });

  protected readonly errorTitle = computed(() => {
    switch (this.error()?.kind) {
      case 'network':
        return 'Connection problem';
      case 'unauthorized':
        return 'Session problem';
      case 'forbidden':
        return 'Access denied';
      case 'validation':
        return 'Invalid search';
      case 'rate-limited':
        return 'Too many requests';
      case 'upstream':
        return 'Data provider unavailable';
      default:
        return 'Something went wrong';
    }
  });

  /** Retrying cannot fix a rejected search; the user has to change the filters. */
  protected readonly canRetry = computed(() => this.error()?.kind !== 'validation');
}
