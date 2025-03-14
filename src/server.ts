import express from "express";
import { Server } from "socket.io";
import http from "http";
import path from "path";
import { BLACKLISTED_IPS, recentRequests, countryStats } from "./config";
import { getNetworkStats, NetStats } from "./modules/getNetworkStats";
import { getNetworkInterfaces } from "./modules/getNetworkInterfaces";
import { formatBytes } from "./utils/formatBytes";

export const app = express();
export const server = http.createServer(app);
export const io = new Server(server);
export const PORT = 9000;

let previousStats: Record<string, NetStats> = {};
const INTERFACES = getNetworkInterfaces();

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/traffic", (req, res) => {
  const interfaceData = INTERFACES.map((iface) => {
    const stats = getNetworkStats(iface);

    let rx_speed = "0 B/s";
    let tx_speed = "0 B/s";

    if (previousStats[iface]) {
      const prev = previousStats[iface];

      rx_speed = `${formatBytes(stats.rx_bytes - prev.rx_bytes)}/s`;
      tx_speed = `${formatBytes(stats.tx_bytes - prev.tx_bytes)}/s`;
    }

    previousStats[iface] = stats;

    return {
      iface,
      stats: {
        Inbound_bytes: formatBytes(stats.rx_bytes),
        Outbound_bytes: formatBytes(stats.tx_bytes),
        Inbound_speed: rx_speed,
        Outbound_speed: tx_speed,
        Packets_in: stats.rx_packets,
        Packets_out: stats.tx_packets,
      },
    };
  });

  res.json({
    recentRequests,
    blacklisted: Array.from(BLACKLISTED_IPS),
    countryStats,
    interfaces: interfaceData,
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
