import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EntityListPageComponent } from '../../../components/list/entity-list-page/entity-list-page.component';
import { EntityColumn } from '../../../components/list/entity-table/entity-table.component';
import { toPersonRow } from '../../../mappers/display.mapper';
import { StarWarsService } from '../../../services/star-wars.service';
import { createEntityList, sortKeysOf } from '../../../components/list/support/entity-list';

@Component({
  selector: 'app-people',
  imports: [EntityListPageComponent],
  templateUrl: './people.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PeopleComponent {
  private readonly api = inject(StarWarsService);

  protected readonly columns: EntityColumn[] = [
    { key: 'name', header: 'Name', sortKey: 'name' },
    { key: 'id', header: 'ID' },
    { key: 'gender', header: 'Gender' },
    { key: 'birthYear', header: 'Birth year' },
    { key: 'height', header: 'Height', sortKey: 'height' },
    { key: 'mass', header: 'Mass', sortKey: 'mass' },
  ];

  protected readonly list = createEntityList(
    (query) => this.api.getPeople(query),
    toPersonRow,
    sortKeysOf(this.columns),
  );
}
