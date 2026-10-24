import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../session/auth.service';
import {
  LOGIN_PASSWORD_MAX_LENGTH,
  LOGIN_USERNAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from '../support/credential-rules';
import { returnUrlOrDefault } from '../../guard/return-url';
import { ApiError, tooManyAttemptsMessage } from '../../../http/api-error';

function messageFor(error: ApiError): string {
  switch (error.kind) {
    case 'rate-limited':
      return tooManyAttemptsMessage(error);
    case 'unauthorized':
      return 'Invalid username or password.';
    default:
      return error.message;
  }
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly form = this.fb.nonNullable.group({
    username: [
      this.registeredUsername(),
      [Validators.required, Validators.maxLength(LOGIN_USERNAME_MAX_LENGTH)],
    ],
    password: ['', [Validators.required, Validators.maxLength(LOGIN_PASSWORD_MAX_LENGTH)]],
  });

  protected readonly submitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly sessionExpired = computed(() => this.query.get('reason') === 'expired');
  protected readonly justRegistered = this.query.get('registered') === '1';

  protected invalid(name: 'username' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected submit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.auth
      .login(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigateByUrl(returnUrlOrDefault(this.query.get('returnUrl'))),
        error: (error: ApiError) => {
          this.errorMessage.set(messageFor(error));
          this.form.controls.password.reset('');
          this.submitting.set(false);
        },
      });
  }

  /** Username handed over by the registration page; used only if it is a valid username. */
  private registeredUsername(): string {
    const username = this.query.get('username') ?? '';
    const valid = username.length <= USERNAME_MAX_LENGTH && USERNAME_PATTERN.test(username);
    return this.query.get('registered') === '1' && valid ? username : '';
  }
}
