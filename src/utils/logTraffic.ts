import {
  BLACKLISTED_IPS,
  trafficStats,
  recentRequests,
  countryStats,
  LOG_FILE,
} from "../config";
import fs from "fs";
import { io } from "../server";

export function logTraffic(ip: string, size: number) {
  fs.appendFileSync(
    LOG_FILE,
    `${new Date().toISOString()} - ${ip} - ${size} bytes\n`
  );
  trafficStats[ip] = (trafficStats[ip] || 0) + size;
  recentRequests.unshift({ ip, size, timestamp: new Date().toISOString() });
  if (recentRequests.length > 50) recentRequests.pop();
  io.emit("updateData", {
    recentRequests,
    blacklisted: Array.from(BLACKLISTED_IPS),
    countryStats,
  });
}
