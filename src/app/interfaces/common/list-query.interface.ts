/**
 * Query accepted by the listing endpoints. Null filters and a null sort are not sent.
 * `sort` is a field name, prefixed with `-` for descending order (e.g. `-mass`).
 */
export interface ListQuery {
  page: number;
  id: string | null;
  name: string | null;
  sort: string | null;
}

export const NAME_MAX_LENGTH = 100;

/** Entity IDs are positive integers of at most 9 digits. */
export const ID_PATTERN = /^[1-9]\d{0,8}$/;
