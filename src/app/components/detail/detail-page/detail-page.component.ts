import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { ApiError } from '../../../http/api-error';
import { DetailState } from '../support/entity-detail';
import { ListStateComponent } from '../../list/list-state/list-state.component';

/**
 * Frame shared by the four detail pages: back link, heading, and the loading, not-found and
 * error states. The page projects its own content, which is shown once the data is ready.
 */
@Component({
  selector: 'app-detail-page',
  imports: [RouterLink, ListStateComponent],
  templateUrl: './detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailPageComponent {
  private readonly injector = inject(Injector);

  readonly state = input.required<DetailState<unknown>>();
  /** Singular noun, e.g. "person". */
  readonly entityLabel = input.required<string>();
  /** Route of the listing, e.g. "/people". */
  readonly listPath = input.required<string>();
  /** Plural noun used in "Back to ...", e.g. "people". */
  readonly listLabel = input.required<string>();
  /** Heading shown once the data is loaded. */
  readonly title = input('');
  /** Key facts under the heading; empty hides the line. */
  readonly subtitle = input('');
  /** Query params that restore the listing's page and filters. */
  readonly backQueryParams = input<Params>({});

  readonly retry = output<void>();

  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

  protected readonly loading = computed(() => this.state().status === 'loading');

  private readonly apiError = computed<ApiError | null>(() => {
    const state = this.state();
    return state.status === 'error' ? state.error : null;
  });

  protected readonly notFound = computed(() => this.apiError()?.kind === 'not-found');
  protected readonly failure = computed(() => (this.notFound() ? null : this.apiError()));

  protected readonly headingText = computed(() => {
    const label = this.entityLabel();
    const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
    switch (this.state().status) {
      case 'success':
        return this.title();
      case 'loading':
        return `Loading ${label}…`;
      default:
        return this.notFound() ? `${capitalized} not found` : `Could not load ${label}`;
    }
  });

  constructor() {
    // Every settled state (new id, retry, 404) announces itself by moving focus to the heading.
    effect(() => {
      if (this.state().status === 'loading') return;
      afterNextRender(() => this.heading()?.nativeElement.focus(), { injector: this.injector });
    });
  }
}
