/** Paginated envelope returned by every listing endpoint of the backend. */
export interface PageResponse<T> {
  /** Total records matching the filters. */
  count: number;
  /** 1-based requested page. */
  currentPage: number;
  totalPages: number;
  nextPage: number | null;
  previousPage: number | null;
  /** Empty when the requested page is out of range. */
  results: T[];
}
