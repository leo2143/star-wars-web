import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RelatedItem } from '../../../mappers/detail.mapper';

/** Titled list of related entities, each one a link to its own detail page. */
@Component({
  selector: 'app-related-list',
  imports: [RouterLink],
  templateUrl: './related-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelatedListComponent {
  readonly heading = input.required<string>();
  readonly items = input.required<readonly RelatedItem[]>();

  protected readonly headingId = computed(
    () => `related-${this.heading().toLowerCase().replace(/\W+/g, '-')}`,
  );
}
