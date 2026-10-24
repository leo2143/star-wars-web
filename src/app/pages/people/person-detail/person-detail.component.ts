import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AttributeGridComponent } from '../../../components/detail/attribute-grid/attribute-grid.component';
import { DetailPageComponent } from '../../../components/detail/detail-page/detail-page.component';
import { RelatedListComponent } from '../../../components/detail/related-list/related-list.component';
import { EMPTY_VALUE, capitalize, displayText } from '../../../mappers/display.mapper';
import {
  factsLine,
  filmItem,
  personAttributes,
  starshipItem,
  vehicleItem,
} from '../../../mappers/detail.mapper';
import { StarWarsService } from '../../../services/star-wars.service';
import { createEntityDetail } from '../../../components/detail/support/entity-detail';

@Component({
  selector: 'app-person-detail',
  imports: [DetailPageComponent, AttributeGridComponent, RelatedListComponent],
  templateUrl: './person-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PersonDetailComponent {
  private readonly api = inject(StarWarsService);

  protected readonly detail = createEntityDetail((id) => this.api.getPerson(id));

  protected readonly person = this.detail.data;

  protected readonly subtitle = computed(() => {
    const person = this.person();
    if (!person) return '';
    const birth = displayText(person.birthYear);
    return factsLine([
      capitalize(displayText(person.gender)),
      birth === EMPTY_VALUE ? birth : `Born ${birth}`,
    ]);
  });

  protected readonly attributes = computed(() => {
    const person = this.person();
    return person ? personAttributes(person) : [];
  });
  protected readonly films = computed(() => this.person()?.films.map(filmItem) ?? []);
  protected readonly starships = computed(() => this.person()?.starships.map(starshipItem) ?? []);
  protected readonly vehicles = computed(() => this.person()?.vehicles.map(vehicleItem) ?? []);
}
