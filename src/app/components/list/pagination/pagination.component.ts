import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Previous/next navigation driven by the paging metadata returned by the backend. */
@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly count = input.required<number>();
  readonly nextPage = input<number | null>(null);
  readonly previousPage = input<number | null>(null);
  readonly busy = input(false);

  readonly pageChange = output<number>();

  protected go(page: number | null): void {
    if (page !== null && !this.busy()) this.pageChange.emit(page);
  }
}
