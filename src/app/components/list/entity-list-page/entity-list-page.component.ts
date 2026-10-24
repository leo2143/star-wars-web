import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityRow } from '../../../interfaces/common/entity-row.interface';
import { PageResponse } from '../../../interfaces/common/page-response.interface';
import { EntityList } from '../support/entity-list';
import { toBackParam } from '../support/list-back';
import { EntityColumn, EntityTableComponent } from '../entity-table/entity-table.component';
import { EntityFiltersComponent, FilterValues } from '../entity-filters/entity-filters.component';
import { EmptyReason, ListStateComponent } from '../list-state/list-state.component';
import { PageHeaderComponent } from '../../layout/page-header/page-header.component';
import { PaginationComponent } from '../pagination/pagination.component';

/**
 * Shared screen of the four listings: header, filters, results and pagination.
 * Filters, sort and page live in the URL, so every interaction is a navigation.
 */
@Component({
  selector: 'app-entity-list-page',
  imports: [
    EntityFiltersComponent,
    EntityTableComponent,
    ListStateComponent,
    PageHeaderComponent,
    PaginationComponent,
  ],
  templateUrl: './entity-list-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityListPageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly title = input.required<string>();
  readonly description = input('');
  /** Plural noun used in messages, e.g. "starships". */
  readonly entityLabel = input.required<string>();
  readonly nameLabel = input('Name');
  readonly columns = input.required<readonly EntityColumn[]>();
  readonly list = input.required<EntityList<EntityRow>>();
  readonly detailKey = input<string | null>(null);
  readonly detailLabel = input('Details');
  /** Base path of the detail pages (e.g. "/people"); rows link to "{detailPath}/{id}". */
  readonly detailPath = input<string | null>(null);

  protected readonly state = computed(() => this.list().state());
  protected readonly query = computed(() => this.list().query());

  /** Page to display: the fresh one, or the previous one while the next is loading. */
  protected readonly page = computed<PageResponse<EntityRow> | null>(() => {
    const state = this.state();
    if (state.status === 'success') return state.page;
    return state.status === 'loading' ? state.previous : null;
  });

  /** Lets the detail page return to this exact page and filters. */
  protected readonly linkQueryParams = computed(() => ({ back: toBackParam(this.query()) }));

  protected readonly busy = computed(() => this.state().status === 'loading');

  protected readonly error = computed(() => {
    const state = this.state();
    return state.status === 'error' ? state.error : null;
  });

  protected readonly emptyReason = computed<EmptyReason>(() => {
    if ((this.page()?.count ?? 0) > 0) return 'out-of-range';
    const { id, name } = this.query();
    return id || name ? 'no-matches' : 'no-data';
  });

  protected search(filters: FilterValues): void {
    this.navigate(1, filters);
  }

  protected clear(): void {
    this.navigate(1, { id: null, name: null });
  }

  protected goToPage(page: number): void {
    const { id, name } = this.query();
    this.navigate(page, { id, name });
  }

  protected sortBy(sort: string | null): void {
    const { id, name } = this.query();
    this.navigate(1, { id, name }, sort);
  }

  protected retry(): void {
    this.list().retry();
  }

  /** Filters and paging keep the current sort unless a new one is given. */
  private navigate(page: number, filters: FilterValues, sort = this.query().sort): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? page : null, id: filters.id, name: filters.name, sort },
    });
  }
}
