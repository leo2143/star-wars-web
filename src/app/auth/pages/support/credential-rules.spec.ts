import { FormControl, FormGroup } from '@angular/forms';
import { USERNAME_PATTERN, differsFromUsername, utf8MaxBytes } from './credential-rules';

describe('USERNAME_PATTERN', () => {
  it.each(['luke', 'Luke.Sky-walker_1', 'a.b'])('accepts %s', (value) => {
    expect(USERNAME_PATTERN.test(value)).toBe(true);
  });

  it.each(['has space', 'ñandú', 'a@b', 'semi;colon', ''])('rejects "%s"', (value) => {
    expect(USERNAME_PATTERN.test(value)).toBe(false);
  });
});

describe('utf8MaxBytes', () => {
  const validate = (value: string) => utf8MaxBytes(72)(new FormControl(value));

  it('counts bytes, not characters', () => {
    expect(validate('a'.repeat(72))).toBeNull();
    expect(validate('a'.repeat(73))).toEqual({ maxBytes: { max: 72, actual: 73 } });
    expect(validate('é'.repeat(36))).toBeNull();
    expect(validate('é'.repeat(37))).toEqual({ maxBytes: { max: 72, actual: 74 } });
    expect(validate('😀'.repeat(18))).toBeNull();
    expect(validate('😀'.repeat(19))).toEqual({ maxBytes: { max: 72, actual: 76 } });
  });

  it('accepts an empty value (required handles that)', () => {
    expect(validate('')).toBeNull();
  });
});

describe('differsFromUsername', () => {
  const validate = (username: string, password: string) =>
    differsFromUsername(
      new FormGroup({ username: new FormControl(username), password: new FormControl(password) }),
    );

  it('flags a password equal to the username, ignoring case', () => {
    expect(validate('SomeOne.Long', 'someone.long')).toEqual({ sameAsUsername: true });
  });

  it('accepts different values and empty fields', () => {
    expect(validate('luke', 'another-password')).toBeNull();
    expect(validate('', '')).toBeNull();
  });
});
