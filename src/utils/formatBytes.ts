export function formatBytes(bytes: number): string {
  const sizes = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (bytes >= 1024 && i < sizes.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${sizes[i]}`;
}
