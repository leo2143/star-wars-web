import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EntityListPageComponent } from '../../../components/list/entity-list-page/entity-list-page.component';
import { EntityColumn } from '../../../components/list/entity-table/entity-table.component';
import { toFilmRow } from '../../../mappers/display.mapper';
import { StarWarsService } from '../../../services/star-wars.service';
import { createEntityList, sortKeysOf } from '../../../components/list/support/entity-list';

@Component({
  selector: 'app-films',
  imports: [EntityListPageComponent],
  templateUrl: './films.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FilmsComponent {
  private readonly api = inject(StarWarsService);

  protected readonly columns: EntityColumn[] = [
    { key: 'title', header: 'Title', sortKey: 'title' },
    { key: 'episode', header: 'Episode', sortKey: 'episodeId' },
    { key: 'director', header: 'Director' },
    { key: 'releaseDate', header: 'Release date', sortKey: 'releaseDate' },
  ];

  protected readonly list = createEntityList(
    (query) => this.api.getFilms(query),
    toFilmRow,
    sortKeysOf(this.columns),
  );
}
