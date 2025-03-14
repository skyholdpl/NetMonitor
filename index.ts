import { exec } from "child_process";
import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";
import express from "express";
import { Server } from "socket.io";
import http from "http";

dotenv.config();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL
  ? process.env.DISCORD_WEBHOOK_URL.trim()
  : "";

if (!DISCORD_WEBHOOK_URL) {
  console.error("Discord webhook not set in .env file!");
  process.exit(1);
}

const INTERFACES = ["eth0", "wlan0"];
const IP_TIMEOUT_MS = 90000;
const MAX_BATCH_SIZE = 6;
const DISPATCH_INTERVAL_MS = 60000;
const LOG_FILE = "logs/network.log";
const BLACKLISTED_IPS = new Set();
const lastSeenIPs = new Map();
interface NetworkMessage {
  ip: string;
  location: string;
  isp: string;
  size: number;
  country: string;
}
let messageQueue: NetworkMessage[] = [];
interface TrafficStats {
  [ip: string]: number;
}
let recentRequests: { ip: string; size: number; timestamp: string }[] = [];
interface CountryStats {
  [country: string]: number;
}

let trafficStats: TrafficStats = {};
let countryStats: CountryStats = {};

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 9000;

app.use(express.static("public"));
app.get("/api/traffic", (req, res) => {
  res.json({
    recentRequests,
    blacklisted: Array.from(BLACKLISTED_IPS),
    countryStats,
  });
});

server.listen(PORT, () =>
  console.log(`Web dashboard running on http://localhost:${PORT}`)
);

io.on("connection", (socket) => {
  socket.emit("updateData", {
    recentRequests,
    blacklisted: Array.from(BLACKLISTED_IPS),
    countryStats,
  });
});

async function getIPInfo(ip: string) {
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

function isPrivateIP(ip: string): boolean {
  const parts = ip.split(".");
  return (
    ip === "255.255.255.255" ||
    parts[0] === "10" ||
    (parts[0] === "172" && +parts[1] >= 16 && +parts[1] <= 31) ||
    (parts[0] === "192" && parts[1] === "168")
  );
}

function logTraffic(ip: string, size: number) {
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

function detectAnomalies(ip: string, size: number): boolean {
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

async function analyzeTraffic(interfaceName: string) {
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

function sendToDiscord() {
  if (messageQueue.length === 0) return;
  const batch = messageQueue.splice(0, MAX_BATCH_SIZE);
  const embed = {
    title: "New network activity detected",
    color: 16711680,
    fields: batch.map((entry) => ({
      name: `IP: ${entry.ip}`,
      value: `Location: **${entry.location}**\nISP: **${entry.isp}**\nSize: **${entry.size} bytes**`,
      inline: true,
    })),
    timestamp: new Date().toISOString(),
  };
  axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] }).catch(console.error);

  io.emit("updateData", {
    recentRequests,
    blacklisted: Array.from(BLACKLISTED_IPS),
    countryStats,
  });
}

setInterval(sendToDiscord, DISPATCH_INTERVAL_MS);
INTERFACES.forEach(analyzeTraffic);
