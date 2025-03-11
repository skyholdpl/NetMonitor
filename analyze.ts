import { exec } from "child_process";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

if (!DISCORD_WEBHOOK_URL) {
  console.error("❌ Brak ustawionego webhooka Discorda w pliku .env!");
  process.exit(1);
}

async function getIPInfo(ip: string): Promise<string> {
  try {
    const res = await axios.get(`https://ipinfo.io/${ip}/json`);
    return `${res.data.city || "Nieznane"}, ${res.data.country || "Nieznane"}`;
  } catch (error) {
    return "Nieznane";
  }
}

function analyzeTraffic() {
  console.log("🚀 Monitoring ruchu sieciowego...");

  const process = exec("sudo tcpdump -i eth0 -nn -q -c 10");

  process.stdout?.on("data", async (data) => {
    const lines = data.toString().split("\n");

    for (const line of lines) {
      const parts = line.split(" ");
      if (parts.length < 5) continue;

      let ip = parts[2].split(".").slice(0, 4).join(".");
      let size = parts[parts.length - 1];

      if (!ip.includes(".")) continue;

      let location = await getIPInfo(ip);

      let message = `📡 **Nowy pakiet wykryty**:
🌍 IP: \`${ip}\`
📍 Lokalizacja: \`${location}\`
📦 Rozmiar pakietu: \`${size}\` bajtów`;

      axios
        .post(DISCORD_WEBHOOK_URL, { content: message })
        .then(() => console.log(`✅ Wysłano alert o IP: ${ip}`))
        .catch((err) => console.error("❌ Błąd wysyłania webhooka:", err));
    }
  });

  process.stderr?.on("data", (err) => console.error("❌ Błąd tcpdump:", err));
}

analyzeTraffic();
