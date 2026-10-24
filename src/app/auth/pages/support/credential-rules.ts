import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Registration rules enforced by the backend; checking them here only saves a round trip. */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 50;
export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 64;
/** The backend limits the password to 72 bytes of UTF-8. */
export const PASSWORD_MAX_BYTES = 72;

/** Login limits accepted by the backend (not the registration rules). */
export const LOGIN_USERNAME_MAX_LENGTH = 100;
export const LOGIN_PASSWORD_MAX_LENGTH = 200;

/** Limits the UTF-8 size of a value: accented letters and emoji take more than one byte. */
export function utf8MaxBytes(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const actual = new TextEncoder().encode(String(control.value ?? '')).length;
    return actual > max ? { maxBytes: { max, actual } } : null;
  };
}

/** Group validator: the password must not be the username (case-insensitive). */
export const differsFromUsername: ValidatorFn = (group) => {
  const username = String(group.get('username')?.value ?? '').toLowerCase();
  const password = String(group.get('password')?.value ?? '').toLowerCase();
  return username !== '' && username === password ? { sameAsUsername: true } : null;
};
