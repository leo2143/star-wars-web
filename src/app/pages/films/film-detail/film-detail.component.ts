import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AttributeGridComponent } from '../../../components/detail/attribute-grid/attribute-grid.component';
import { DetailPageComponent } from '../../../components/detail/detail-page/detail-page.component';
import { RelatedListComponent } from '../../../components/detail/related-list/related-list.component';
import {
  factsLine,
  filmAttributes,
  personItem,
  starshipItem,
  vehicleItem,
} from '../../../mappers/detail.mapper';
import { EMPTY_VALUE, displayText } from '../../../mappers/display.mapper';
import { StarWarsService } from '../../../services/star-wars.service';
import { createEntityDetail } from '../../../components/detail/support/entity-detail';

@Component({
  selector: 'app-film-detail',
  imports: [DetailPageComponent, AttributeGridComponent, RelatedListComponent],
  templateUrl: './film-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FilmDetailComponent {
  private readonly api = inject(StarWarsService);

  protected readonly detail = createEntityDetail((id) => this.api.getFilm(id));

  protected readonly film = this.detail.data;

  protected readonly subtitle = computed(() => {
    const film = this.film();
    if (!film) return '';
    const director = displayText(film.director);
    return factsLine([
      `Episode ${film.episodeId}`,
      displayText(film.releaseDate),
      director === EMPTY_VALUE ? director : `Directed by ${director}`,
    ]);
  });

  /** The crawl with normalized line breaks, or null when the source has none. */
  protected readonly crawl = computed(() => {
    const text = displayText(this.film()?.openingCrawl);
    return text === EMPTY_VALUE ? null : text.replace(/\r\n?/g, '\n');
  });

  protected readonly attributes = computed(() => {
    const film = this.film();
    return film ? filmAttributes(film) : [];
  });
  protected readonly characters = computed(() => this.film()?.characters.map(personItem) ?? []);
  protected readonly starships = computed(() => this.film()?.starships.map(starshipItem) ?? []);
  protected readonly vehicles = computed(() => this.film()?.vehicles.map(vehicleItem) ?? []);
}
