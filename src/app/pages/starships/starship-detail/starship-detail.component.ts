import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AttributeGridComponent } from '../../../components/detail/attribute-grid/attribute-grid.component';
import { DetailPageComponent } from '../../../components/detail/detail-page/detail-page.component';
import { RelatedListComponent } from '../../../components/detail/related-list/related-list.component';
import { factsLine, filmItem, starshipAttributes } from '../../../mappers/detail.mapper';
import { displayText } from '../../../mappers/display.mapper';
import { StarWarsService } from '../../../services/star-wars.service';
import { createEntityDetail } from '../../../components/detail/support/entity-detail';

@Component({
  selector: 'app-starship-detail',
  imports: [DetailPageComponent, AttributeGridComponent, RelatedListComponent],
  templateUrl: './starship-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StarshipDetailComponent {
  private readonly api = inject(StarWarsService);

  protected readonly detail = createEntityDetail((id) => this.api.getStarship(id));

  protected readonly starship = this.detail.data;

  protected readonly subtitle = computed(() => {
    const ship = this.starship();
    return ship ? factsLine([displayText(ship.starshipClass), displayText(ship.manufacturer)]) : '';
  });

  protected readonly attributes = computed(() => {
    const ship = this.starship();
    return ship ? starshipAttributes(ship) : [];
  });
  protected readonly films = computed(() => this.starship()?.films.map(filmItem) ?? []);
}
