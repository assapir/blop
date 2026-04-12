export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`;
}

export function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toISOString().split("T")[0];
}

export function joinDeps(deps: { depString: string }[]): string {
  return deps.map((d) => d.depString).join("  ") || "None";
}
