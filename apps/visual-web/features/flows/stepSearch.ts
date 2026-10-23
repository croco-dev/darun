export function stepSearch(search: string, stepNumber: number): string {
  const params = new URLSearchParams(search);
  params.delete('step');
  if (stepNumber > 1) params.set('step', String(stepNumber));
  const query = params.toString();
  return query ? `?${query}` : '';
}
