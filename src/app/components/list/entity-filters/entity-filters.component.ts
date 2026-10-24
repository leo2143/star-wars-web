import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ID_PATTERN, NAME_MAX_LENGTH } from '../../../interfaces/common/list-query.interface';

export interface FilterValues {
  id: string | null;
  name: string | null;
}

/** Search form shared by the four listings. The applied filters come from the URL. */
@Component({
  selector: 'app-entity-filters',
  imports: [ReactiveFormsModule],
  templateUrl: './entity-filters.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityFiltersComponent {
  private readonly fb = inject(FormBuilder);

  /** "Name" for most entities, "Title" for films. */
  readonly nameLabel = input('Name');
  readonly appliedId = input<string | null>(null);
  readonly appliedName = input<string | null>(null);

  readonly search = output<FilterValues>();
  readonly clear = output<void>();

  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  protected readonly form = this.fb.nonNullable.group({
    id: ['', [Validators.pattern(ID_PATTERN)]],
    name: ['', [Validators.maxLength(NAME_MAX_LENGTH)]],
  });

  protected readonly hasApplied = computed(() => !!this.appliedId() || !!this.appliedName());

  constructor() {
    // The URL is the source of truth: reflect it in the inputs (reload, back/forward, deep links).
    effect(() => {
      this.form.setValue({ id: this.appliedId() ?? '', name: this.appliedName() ?? '' });
    });
  }

  protected idInvalid(): boolean {
    const control = this.form.controls.id;
    return control.invalid && (control.touched || control.dirty);
  }

  protected nameInvalid(): boolean {
    const control = this.form.controls.name;
    return control.invalid && (control.touched || control.dirty);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { id, name } = this.form.getRawValue();
    this.search.emit({ id: id.trim() || null, name: name.trim() || null });
  }

  protected reset(): void {
    this.form.reset({ id: '', name: '' });
    this.clear.emit();
  }
}
