import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EntityListPageComponent } from '../../../components/list/entity-list-page/entity-list-page.component';
import { EntityColumn } from '../../../components/list/entity-table/entity-table.component';
import { toVehicleRow } from '../../../mappers/display.mapper';
import { StarWarsService } from '../../../services/star-wars.service';
import { createEntityList, sortKeysOf } from '../../../components/list/support/entity-list';

@Component({
  selector: 'app-vehicles',
  imports: [EntityListPageComponent],
  templateUrl: './vehicles.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class VehiclesComponent {
  private readonly api = inject(StarWarsService);

  protected readonly columns: EntityColumn[] = [
    { key: 'name', header: 'Name', sortKey: 'name' },
    { key: 'model', header: 'Model' },
    { key: 'manufacturer', header: 'Manufacturer' },
    { key: 'vehicleClass', header: 'Class' },
    { key: 'cost', header: 'Cost', sortKey: 'costInCredits' },
  ];

  protected readonly list = createEntityList(
    (query) => this.api.getVehicles(query),
    toVehicleRow,
    sortKeysOf(this.columns),
  );
}
