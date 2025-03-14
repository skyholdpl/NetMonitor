import { execSync } from "child_process";

export interface NetStats {
  rx_bytes: number;
  tx_bytes: number;
  rx_packets: number;
  tx_packets: number;
}

export function getNetworkStats(interfaceName: string): NetStats {
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
