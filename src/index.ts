import { DISPATCH_INTERVAL_MS, INTERFACES } from "./config";
import dotenv from "dotenv";
import { analyzeTraffic } from "./utils/analyzeTraffic";
import { sendToDiscord } from "./utils/sendToDiscord";

console.log("Network traffic monitoring...");

dotenv.config();

export const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL
  ? process.env.DISCORD_WEBHOOK_URL.trim()
  : "";

if (!DISCORD_WEBHOOK_URL) {
  console.error("Discord webhook not set in .env file!");
  process.exit(1);
}

setInterval(sendToDiscord, DISPATCH_INTERVAL_MS);
INTERFACES.forEach(analyzeTraffic);

import "./server";
