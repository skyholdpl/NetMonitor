import axios from "axios";
import { io } from "../server";
import {
  MAX_BATCH_SIZE,
  countryStats,
  BLACKLISTED_IPS,
  recentRequests,
  messageQueue,
} from "../config";
import { DISCORD_WEBHOOK_URL } from "../index";

export function sendToDiscord() {
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
