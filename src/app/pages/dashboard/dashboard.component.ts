import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/session/auth.service';
import { EXPLORE_ITEMS } from '../../components/layout/navigation';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DashboardComponent {
  protected readonly username = inject(AuthService).username;
  protected readonly items = EXPLORE_ITEMS;
}
