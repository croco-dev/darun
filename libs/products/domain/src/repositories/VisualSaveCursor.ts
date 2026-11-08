/** Exact save boundary, including PostgreSQL microseconds, independent of target lifetime. */
export interface VisualSaveCursor {
  savedAt: string;
  saveId: string;
}
