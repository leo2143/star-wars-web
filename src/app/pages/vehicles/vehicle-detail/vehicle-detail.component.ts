import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AttributeGridComponent } from '../../../components/detail/attribute-grid/attribute-grid.component';
import { DetailPageComponent } from '../../../components/detail/detail-page/detail-page.component';
import { RelatedListComponent } from '../../../components/detail/related-list/related-list.component';
import { factsLine, filmItem, vehicleAttributes } from '../../../mappers/detail.mapper';
import { displayText } from '../../../mappers/display.mapper';
import { StarWarsService } from '../../../services/star-wars.service';
import { createEntityDetail } from '../../../components/detail/support/entity-detail';

@Component({
  selector: 'app-vehicle-detail',
  imports: [DetailPageComponent, AttributeGridComponent, RelatedListComponent],
  templateUrl: './vehicle-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class VehicleDetailComponent {
  private readonly api = inject(StarWarsService);

  protected readonly detail = createEntityDetail((id) => this.api.getVehicle(id));

  protected readonly vehicle = this.detail.data;

  protected readonly subtitle = computed(() => {
    const vehicle = this.vehicle();
    return vehicle
      ? factsLine([displayText(vehicle.vehicleClass), displayText(vehicle.manufacturer)])
      : '';
  });

  protected readonly attributes = computed(() => {
    const vehicle = this.vehicle();
    return vehicle ? vehicleAttributes(vehicle) : [];
  });
  protected readonly films = computed(() => this.vehicle()?.films.map(filmItem) ?? []);
}
