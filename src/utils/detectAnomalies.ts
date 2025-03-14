import {
  BLACKLISTED_IPS,
  trafficStats,
  recentRequests,
  countryStats,
} from "../config";
import { io } from "../server";
import { exec } from "child_process";

export function detectAnomalies(ip: string, size: number): boolean {
  if (trafficStats[ip] > 1000000) {
    BLACKLISTED_IPS.add(ip);
    exec(`sudo iptables -A INPUT -s ${ip} -j DROP`);
    console.log(`Blocked IP: ${ip} due to high traffic!`);
    io.emit("updateData", {
      recentRequests,
      blacklisted: Array.from(BLACKLISTED_IPS),
      countryStats,
    });
    return true;
  }
  return false;
}
