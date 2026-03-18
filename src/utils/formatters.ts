export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export function getElapsedTime(startedAt: string): number {
  const startTime = new Date(startedAt).getTime();
  return Math.floor((Date.now() - startTime) / 1000);
}

export function formatElapsedTime(startedAt: string): string {
  const elapsed = getElapsedTime(startedAt);
  return formatDuration(elapsed);
}
