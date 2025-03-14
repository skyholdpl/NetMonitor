import { execSync } from "child_process";

const INTERVAL = 2000;

interface NetStats {
  rx_bytes: number;
  tx_bytes: number;
  rx_packets: number;
  tx_packets: number;
}

function getNetworkInterfaces(): string[] {
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

function getNetworkStats(interfaceName: string): NetStats {
  try {
    const result = execSync(
      `cat /sys/class/net/${interfaceName}/statistics/*_bytes /sys/class/net/${interfaceName}/statistics/*_packets`
    )
      .toString()
      .trim()
      .split("\n")
      .map(Number);

    return {
      rx_bytes: result[0],
      tx_bytes: result[1],
      rx_packets: result[2],
      tx_packets: result[3],
    };
  } catch (error) {
    console.warn(`⚠️ Interface ${interfaceName} does not exist – I omit it.`);
    return { rx_bytes: 0, tx_bytes: 0, rx_packets: 0, tx_packets: 0 };
  }
}

function formatBytes(bytes: number): string {
  const sizes = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (bytes >= 1024 && i < sizes.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${sizes[i]}`;
}

console.log("📊 Network traffic monitoring...");
let previousStats: Record<string, NetStats> = {};
const INTERFACES = getNetworkInterfaces();

setInterval(() => {
  INTERFACES.forEach((iface) => {
    const stats = getNetworkStats(iface);
    if (previousStats[iface]) {
      const prev = previousStats[iface];

      const rx_speed = stats.rx_bytes - prev.rx_bytes;
      const tx_speed = stats.tx_bytes - prev.tx_bytes;

      console.log(`\nStatistics for ${iface}:`);
      console.log(
        `Inbound: ${formatBytes(stats.rx_bytes)} (${formatBytes(rx_speed)}/s)`
      );
      console.log(
        `Outbound: ${formatBytes(stats.tx_bytes)} (${formatBytes(tx_speed)}/s)`
      );
      console.log(
        `Packets In: ${stats.rx_packets}  |  Out: ${stats.tx_packets}`
      );
    }

    previousStats[iface] = stats;
  });
}, INTERVAL);
