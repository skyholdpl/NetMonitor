import { analyzeTraffic } from "./modules/network";
import { sendToDiscord } from "./modules/discord";
import { getNetworkInterfaces } from "./modules/network";
import dotenv from "dotenv";

dotenv.config();

const INTERFACES = getNetworkInterfaces();

setInterval(sendToDiscord, 60000);
INTERFACES.forEach(analyzeTraffic);
