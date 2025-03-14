export function isPrivateIP(ip: string): boolean {
  const parts = ip.split(".");
  return (
    ip === "255.255.255.255" ||
    parts[0] === "10" ||
    (parts[0] === "172" && +parts[1] >= 16 && +parts[1] <= 31) ||
    (parts[0] === "192" && parts[1] === "168")
  );
}
