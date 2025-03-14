import express from "express";
import { Server } from "socket.io";
import http from "http";
import { BLACKLISTED_IPS, recentRequests, countryStats } from "./config";

export const app = express();
export const server = http.createServer(app);
export const io = new Server(server);
export const PORT = 9000;

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
