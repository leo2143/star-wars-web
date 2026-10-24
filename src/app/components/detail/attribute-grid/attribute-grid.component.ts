import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Attribute } from '../../../mappers/detail.mapper';

/** Titled definition list of the scalar fields of an entity. Values arrive display-ready. */
@Component({
  selector: 'app-attribute-grid',
  templateUrl: './attribute-grid.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttributeGridComponent {
  readonly heading = input('Details');
  readonly attributes = input.required<readonly Attribute[]>();
}
