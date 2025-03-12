import { exec } from "child_process";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL?.trim();

if (!DISCORD_WEBHOOK_URL) {
  console.error("Discord webhook not set in .env file!");
  process.exit(1);
}

const webhookURL: string = DISCORD_WEBHOOK_URL;

const INTERFACE = "eth0";
const IP_TIMEOUT_MS = 90000;
const MAX_BATCH_SIZE = 6;
const DISPATCH_INTERVAL_MS = 60000;

let messageQueue: {
  ip: string;
  location: string;
  isp: string;
  size: number;
}[] = [];
const lastSeenIPs: Map<string, number> = new Map();

async function getIPInfo(
  ip: string
): Promise<{ location: string; isp: string }> {
  try {
    const { data } = await axios.get(`https://ipinfo.io/${ip}/json`);
    return {
      location: `${data.city || "Unknown"}, ${data.country || "Unknown"}`,
      isp: data.org || "Unknown ISP",
    };
  } catch {
    return { location: "Unknown", isp: "Unknown ISP" };
  }
}

function isPrivateIP(ip: string): boolean {
  const parts = ip.split(".");

  if (ip === "255.255.255.255") {
    return true;
  }

  if (parts[0] === "10") {
    return true;
  }

  if (parts[0] === "172" && +parts[1] >= 16 && +parts[1] <= 31) {
    return true;
  }

  if (parts[0] === "192" && parts[1] === "168") {
    return true;
  }

  return false;
}

async function analyzeTraffic(): Promise<void> {
  console.log(
    "Network traffic monitoring has started on the interface:",
    INTERFACE
  );

  const process = exec(`sudo tcpdump -i ${INTERFACE} -nn -q`);

  process.stdout?.on("data", async (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      const parts = line.split(" ");
      if (parts.length < 5) continue;

      const ip = parts[2]?.split(".").slice(0, 4).join(".");
      const packetSize = parseInt(parts[parts.length - 1], 10);
      if (!ip || !ip.includes(".") || isNaN(packetSize) || packetSize === 0)
        continue;

      if (isPrivateIP(ip)) continue;

      const now = Date.now();
      if (
        lastSeenIPs.has(ip) &&
        now - (lastSeenIPs.get(ip) || 0) < IP_TIMEOUT_MS
      )
        continue;

      lastSeenIPs.set(ip, now);
      const { location, isp } = await getIPInfo(ip);

      messageQueue.push({ ip, location, isp, size: packetSize });
    }
  });

  process.stderr?.on("data", (err) => console.error("tcpdump error:", err));
}

function sendToDiscord(): void {
  if (messageQueue.length === 0) return;

  const batch = messageQueue.slice(0, MAX_BATCH_SIZE);
  const embed = {
    title: "New packages detected",
    color: 16711680,
    fields: batch.map((entry) => ({
      name: `IP: ${entry.ip}`,
      value: `Location: **${entry.location}**\nISP: **${entry.isp}**\nSize: **${entry.size} bytes**`,
      inline: true,
    })),
    timestamp: new Date().toISOString(),
  };

  messageQueue = messageQueue.slice(batch.length);

  axios
    .post(webhookURL, { embeds: [embed] })
    .then(() => console.log("Data sent to Discord"))
    .catch((err) => console.error("Error sending webhook:", err));
}

setInterval(sendToDiscord, DISPATCH_INTERVAL_MS);

analyzeTraffic();
