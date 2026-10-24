import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../session/auth.service';
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
  differsFromUsername,
  utf8MaxBytes,
} from '../support/credential-rules';
import { ApiError, tooManyAttemptsMessage } from '../../../http/api-error';

type Field = 'username' | 'password';

const MESSAGES: Record<Field, Record<string, string>> = {
  username: {
    required: 'Username is required.',
    minlength: `Username must be at least ${USERNAME_MIN_LENGTH} characters.`,
    maxlength: `Username must be at most ${USERNAME_MAX_LENGTH} characters.`,
    pattern: 'Use only letters, numbers, dots, underscores and hyphens.',
  },
  password: {
    required: 'Password is required.',
    minlength: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    maxlength: `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
    maxBytes: `Password is too long once encoded (${PASSWORD_MAX_BYTES} bytes at most). Use fewer accented or special characters.`,
  },
};

const SAME_AS_USERNAME = 'Password must be different from the username.';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = this.fb.nonNullable.group(
    {
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(USERNAME_MIN_LENGTH),
          Validators.maxLength(USERNAME_MAX_LENGTH),
          Validators.pattern(USERNAME_PATTERN),
        ],
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(PASSWORD_MIN_LENGTH),
          Validators.maxLength(PASSWORD_MAX_LENGTH),
          utf8MaxBytes(PASSWORD_MAX_BYTES),
        ],
      ],
    },
    { validators: differsFromUsername },
  );

  protected readonly submitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /** Messages the backend gave for a field; they disappear when the user edits it. */
  protected readonly serverErrors = signal<Partial<Record<Field, string>>>({});

  /** The message to show under a field, or null when it is fine. */
  protected message(name: Field): string | null {
    const server = this.serverErrors()[name];
    if (server) return server;

    const control = this.form.controls[name];
    if (!control.touched) return null;
    const key = Object.keys(control.errors ?? {})[0];
    if (key) return MESSAGES[name][key] ?? null;
    return name === 'password' && this.form.hasError('sameAsUsername') ? SAME_AS_USERNAME : null;
  }

  protected edited(name: Field): void {
    if (this.serverErrors()[name]) {
      this.serverErrors.update((errors) => ({ ...errors, [name]: undefined }));
    }
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
    this.serverErrors.set({});
    const credentials = this.form.getRawValue();

    this.auth
      .register(credentials)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          void this.router.navigate(['/login'], {
            queryParams: { registered: 1, username: credentials.username },
          }),
        error: (error: ApiError) => {
          this.showError(error);
          this.submitting.set(false);
        },
      });
  }

  private showError(error: ApiError): void {
    if (error.status === 409) {
      this.serverErrors.set({ username: 'Username is not available.' });
      return;
    }

    const fields: Partial<Record<Field, string>> = {};
    for (const { field, message } of error.fieldErrors) {
      if (field === 'username' || field === 'password') fields[field] ??= message;
    }
    if (Object.keys(fields).length > 0) {
      this.serverErrors.set(fields);
      return;
    }
    this.errorMessage.set(
      error.kind === 'rate-limited' ? tooManyAttemptsMessage(error) : error.message,
    );
  }
}
