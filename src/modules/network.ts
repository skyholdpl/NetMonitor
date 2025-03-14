import { execSync, exec } from "child_process";
import { logTraffic, detectAnomalies, getIPInfo } from "../utils/logger";
import { io } from "../server";
import { IP_TIMEOUT_MS, BLACKLISTED_IPS, lastSeenIPs } from "../config";

export function getNetworkInterfaces(): string[] {
  try {
    return execSync("ls /sys/class/net", { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter((iface) => iface.startsWith("eth"));
  } catch (error) {
    console.error("❌ Error while downloading interfaces:", error);
    return [];
  }
}

export function analyzeTraffic(interfaceName: string) {
  console.log("Monitoring interface:", interfaceName);
  const process = exec(`sudo tcpdump -i ${interfaceName} -nn -q`);
  process.stdout?.on("data", async (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      const parts = line.split(" ");
      if (parts.length < 5) continue;

      const ip = parts[2]?.split(".").slice(0, 4).join(".");
      const packetSize = parseInt(parts[parts.length - 1], 10);
      if (!ip || isNaN(packetSize) || packetSize === 0 || isPrivateIP(ip))
        continue;

      if (
        lastSeenIPs.has(ip) &&
        Date.now() - lastSeenIPs.get(ip) < IP_TIMEOUT_MS
      )
        continue;
      lastSeenIPs.set(ip, Date.now());
      logTraffic(ip, packetSize);
      if (detectAnomalies(ip, packetSize)) continue;

      const { location, isp, country } = await getIPInfo(ip);
      io.emit("updateData", {
        location,
        isp,
        country,
      });
    }
  });
  process.stderr?.on("data", (err) => console.error("tcpdump error:", err));
}

function isPrivateIP(ip: string): boolean {
  const parts = ip.split(".");
  return (
    ip === "255.255.255.255" ||
    parts[0] === "10" ||
    (parts[0] === "172" && +parts[1] >= 16 && +parts[1] <= 31) ||
    (parts[0] === "192" && parts[1] === "168")
  );
}
