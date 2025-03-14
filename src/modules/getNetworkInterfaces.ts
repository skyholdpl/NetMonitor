import { execSync } from "child_process";

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
