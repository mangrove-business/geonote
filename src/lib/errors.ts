/** Turn Supabase/network errors into short, friendly sentences. */
export function friendlyError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : '';
  const lower = message.toLowerCase();

  if (lower.includes('too many notes')) {
    return 'You’ve reached the limit of 20 notes per hour. Please try again later.';
  }
  if (lower.includes('not authenticated') || lower.includes('anonymous')) {
    return 'Posting isn’t available right now. You can still browse notes.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed')) {
    return 'You seem to be offline. Check your connection and try again.';
  }
  if (lower.includes('not configured')) {
    return 'The notes backend isn’t configured for this build.';
  }
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'You don’t have permission to do that.';
  }
  return message && message.length < 140 ? message : fallback;
}
