import express from "express";
import http from "http";
import { Server } from "socket.io";

export const app = express();
export const server = http.createServer(app);
export const io = new Server(server);

const PORT = 9000;

app.use(express.static("public"));
app.get("/api/traffic", (req, res) => {
  res.json({
    recentRequests: [],
    blacklisted: Array.from([]),
    countryStats: {},
  });
});

server.listen(PORT, () =>
  console.log(`Web dashboard running on http://localhost:${PORT}`)
);
