import { execSync, exec } from "child_process";
import axios from "axios";
import fs from "fs";
import {
  BLACKLISTED_IPS,
  trafficStats,
  recentRequests,
  countryStats,
} from "../config";
import { io } from "../server";

const LOG_FILE = "logs/network.log";

export async function getIPInfo(ip: string) {
  try {
    const { data } = await axios.get(`https://ipinfo.io/${ip}/json`);
    const country = data.country || "Unknown";
    countryStats[country] = (countryStats[country] || 0) + 1;
    io.emit("updateData", {
      recentRequests,
      blacklisted: Array.from(BLACKLISTED_IPS),
      countryStats,
      countryInfo: data,
    });
    return {
      location: `${data.city || "Unknown"}, ${country}`,
      isp: data.org || "Unknown ISP",
      country,
    };
  } catch {
    return { location: "Unknown", isp: "Unknown ISP", country: "Unknown" };
  }
}

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

export function detectAnomalies(ip: string, size: number): boolean {
  if (trafficStats[ip] > 1000000) {
    BLACKLISTED_IPS.add(ip);
    execSync(`sudo iptables -A INPUT -s ${ip} -j DROP`);
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
