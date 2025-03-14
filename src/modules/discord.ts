import axios from "axios";
import { messageQueue } from "../config";
import { io } from "../server";

export async function sendToDiscord() {
  if (messageQueue.length === 0) return;
  const batch = messageQueue.splice(0, 6);
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
  try {
    await axios.post(process.env.DISCORD_WEBHOOK_URL!, { embeds: [embed] });
  } catch (error) {
    console.error("Error sending to Discord:", error);
  }

  io.emit("updateData", {
    messageQueue,
  });
}
