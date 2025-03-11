import { exec } from "child_process";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

if (!DISCORD_WEBHOOK_URL) {
  console.error("❌ Brak ustawionego webhooka Discorda w pliku .env!");
  process.exit(1);
}

const IP_TIMEOUT = 60000;
const MAX_MESSAGES = 5;
const BATCH_INTERVAL = 60000;
const QUEUE_INTERVAL = 60000;
let messageQueue: string[] = [];
let lastSeenIPs: { [key: string]: number } = {};
let lastSentTimestamp = 0;

async function getIPInfo(ip: string): Promise<string> {
  try {
    const res = await axios.get(`https://ipinfo.io/${ip}/json`);
    const location = `${res.data.city || "Nieznane"}, ${
      res.data.country || "Nieznane"
    }`;
    const isp = res.data.org || "Nieznany ISP";
    return `${location} - ISP: ${isp}`;
  } catch (error) {
    return "Nieznane - ISP: Nieznane";
  }
}

function analyzeTraffic() {
  console.log("🚀 Monitoring ruchu sieciowego...");

  const process = exec("sudo tcpdump -i eth0 -nn -q");

  process.stdout?.on("data", async (data) => {
    const lines = data.toString().split("\n");

    for (const line of lines) {
      const parts = line.split(" ");
      if (parts.length < 5) continue;

      let ip = parts[2].split(".").slice(0, 4).join(".");
      let size = parseInt(parts[parts.length - 1], 10);

      if (!ip.includes(".") || isNaN(size) || size === 0) continue;

      const now = Date.now();
      if (lastSeenIPs[ip] && now - lastSeenIPs[ip] < IP_TIMEOUT) {
        continue;
      }

      lastSeenIPs[ip] = now;

      let locationAndISP = await getIPInfo(ip);

      const message = `🌍 IP: \`${ip}\`・📍 Lokalizacja i ISP: \`${locationAndISP}\`・📦 Rozmiar: \`${size}\` bajtów`;
      messageQueue.push(message);

      if (
        messageQueue.length >= MAX_MESSAGES ||
        now - lastSentTimestamp >= BATCH_INTERVAL
      ) {
        sendToDiscord();
      }
    }
  });

  process.stderr?.on("data", (err) => console.error("❌ Błąd tcpdump:", err));
}

function sendToDiscord() {
  const now = Date.now();

  if (messageQueue.length === 0 || now - lastSentTimestamp < QUEUE_INTERVAL)
    return;

  const content = `📡 **Nowe pakiety wykryte:**\n${messageQueue.join("\n")}`;
  messageQueue = [];
  lastSentTimestamp = now;

  axios
    .post(DISCORD_WEBHOOK_URL, { content })
    .then(() => console.log(`✅ Wysłano ${MAX_MESSAGES} wpisów na Discorda`))
    .catch((err) => console.error("❌ Błąd wysyłania webhooka:", err));
}

setInterval(sendToDiscord, BATCH_INTERVAL);

analyzeTraffic();
