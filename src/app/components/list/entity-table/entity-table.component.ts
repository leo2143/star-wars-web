import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { EntityRow } from '../../../interfaces/common/entity-row.interface';
import { EMPTY_VALUE } from '../../../mappers/display.mapper';

export interface EntityColumn {
  /** Property of the row to display. The first column is the row's primary label. */
  key: string;
  header: string;
  /** Backend field to sort by; the column is sortable only when this is set. */
  sortKey?: string;
}

/**
 * Table on wide screens and cards on narrow ones. Each page declares its own columns, so the
 * component stays unaware of what a person or a film is.
 */
@Component({
  selector: 'app-entity-table',
  imports: [RouterLink],
  templateUrl: './entity-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityTableComponent {
  readonly rows = input.required<readonly EntityRow[]>();
  readonly columns = input.required<readonly EntityColumn[]>();
  /** Accessible name of the table. */
  readonly caption = input.required<string>();
  /** Optional long text of each row, shown in an expandable section. */
  readonly detailKey = input<string | null>(null);
  readonly detailLabel = input('Details');
  /** When set, the primary cell of each row links to "{linkBase}/{id}". */
  readonly linkBase = input<string | null>(null);
  /** Query params added to those links (the "back" position of the list). */
  readonly linkQueryParams = input<Params | null>(null);
  /** True while a newer page is loading: the current rows are kept but dimmed. */
  readonly busy = input(false);
  /** Applied sort: a column `sortKey`, or `-sortKey` for descending. Null is the default order. */
  readonly sort = input<string | null>(null);
  /** Emits the next sort; null goes back to the default order. */
  readonly sortChange = output<string | null>();

  /** Every sortable column in both directions, for the select used on narrow screens. */
  protected readonly sortOptions = computed(() =>
    this.columns().flatMap(({ header, sortKey }) =>
      sortKey
        ? [
            { value: sortKey, label: header + ' (ascending)' },
            { value: '-' + sortKey, label: header + ' (descending)' },
          ]
        : [],
    ),
  );

  protected ariaSort(column: EntityColumn): 'ascending' | 'descending' | 'none' | null {
    if (!column.sortKey) return null;
    if (this.sort() === column.sortKey) return 'ascending';
    return this.sort() === '-' + column.sortKey ? 'descending' : 'none';
  }

  protected sortIcon(column: EntityColumn): string {
    switch (this.ariaSort(column)) {
      case 'ascending':
        return 'fa-sort-up';
      case 'descending':
        return 'fa-sort-down';
      default:
        return 'fa-sort opacity-40';
    }
  }

  /** Clicking a header cycles none, ascending, descending, none. */
  protected toggleSort(sortKey: string): void {
    switch (this.sort()) {
      case sortKey:
        this.sortChange.emit('-' + sortKey);
        break;
      case '-' + sortKey:
        this.sortChange.emit(null);
        break;
      default:
        this.sortChange.emit(sortKey);
    }
  }

  protected chooseSort(event: Event): void {
    this.sortChange.emit((event.target as HTMLSelectElement).value || null);
  }

  protected detailOf(row: EntityRow): string | null {
    const key = this.detailKey();
    const value = key ? row[key] : undefined;
    return value && value !== EMPTY_VALUE ? value : null;
  }
}
