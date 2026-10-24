import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../auth/session/auth.service';
import { NAV_ITEMS } from '../navigation';

/** Primary navigation, session user and sign out. Fixed on desktop, a drawer on mobile. */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  protected readonly auth = inject(AuthService);
  protected readonly items = NAV_ITEMS;

  /** Drawer state on small screens (ignored on desktop, where the menu is always visible). */
  readonly open = input(false);

  private readonly firstLink = viewChild<ElementRef<HTMLAnchorElement>>('firstLink');

  focusFirstLink(): void {
    this.firstLink()?.nativeElement.focus();
  }

  protected initial(name: string | null): string {
    return (name?.trim().charAt(0) || '?').toUpperCase();
  }
}
