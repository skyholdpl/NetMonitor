import axios from "axios";
import { BLACKLISTED_IPS, recentRequests, countryStats } from "../config";
import { io } from "../server";

export async function getIPInfo(ip: string) {
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
