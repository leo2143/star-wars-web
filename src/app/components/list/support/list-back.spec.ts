import { parseBackParam, toBackParam } from './list-back';

describe('toBackParam', () => {
  it('is null for the plain first page', () => {
    expect(toBackParam({ page: 1, id: null, name: null, sort: null })).toBeNull();
  });

  it('keeps page and filters and encodes the name', () => {
    expect(toBackParam({ page: 3, id: null, name: 'luke sky', sort: null })).toBe(
      'page=3&name=luke+sky',
    );
    expect(toBackParam({ page: 1, id: '14', name: null, sort: null })).toBe('id=14');
  });
});

describe('sort in the back param', () => {
  it('is serialized after page and filters', () => {
    expect(toBackParam({ page: 2, id: null, name: 'luke', sort: '-mass' })).toBe(
      'page=2&name=luke&sort=-mass',
    );
    expect(toBackParam({ page: 1, id: null, name: null, sort: 'name' })).toBe('sort=name');
  });

  it('round-trips into list query params', () => {
    const query = { page: 3, id: null, name: 'luke', sort: '-mass' };
    expect(parseBackParam(toBackParam(query))).toEqual(query);
  });

  it('drops a malformed sort and keeps the rest', () => {
    expect(parseBackParam('page=2&sort=--x')).toEqual({
      page: 2,
      id: null,
      name: null,
      sort: null,
    });
    expect(parseBackParam('sort=a%20b')).toEqual({ page: null, id: null, name: null, sort: null });
  });
});

describe('parseBackParam', () => {
  it('rebuilds list query params from a valid value', () => {
    expect(parseBackParam('page=3&name=luke+sky')).toEqual({
      page: 3,
      id: null,
      name: 'luke sky',
      sort: null,
    });
  });

  it('falls back to the plain list when absent', () => {
    expect(parseBackParam(null)).toEqual({});
    expect(parseBackParam('')).toEqual({});
  });

  it('ignores invalid values and unknown keys instead of trusting them', () => {
    expect(parseBackParam('page=abc')).toEqual({});
    expect(parseBackParam('id=-1')).toEqual({});
    expect(parseBackParam('name=' + 'a'.repeat(101))).toEqual({});
    expect(parseBackParam('page=2&redirect=https://evil.test')).toEqual({
      page: 2,
      id: null,
      name: null,
      sort: null,
    });
  });
});
