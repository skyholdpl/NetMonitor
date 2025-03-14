import { exec } from "child_process";
import { isPrivateIP } from "./isPrivateIP";
import { lastSeenIPs, messageQueue, IP_TIMEOUT_MS } from "../config";
import { logTraffic } from "./logTraffic";
import { detectAnomalies } from "./detectAnomalies";
import { getIPInfo } from "../modules/getIPInfo";

export async function analyzeTraffic(interfaceName: string) {
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
      messageQueue.push({ ip, location, isp, size: packetSize, country });
    }
  });
  process.stderr?.on("data", (err) => console.error("tcpdump error:", err));
}
