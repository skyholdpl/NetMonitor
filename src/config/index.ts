export const INTERFACES = ["eth0"];
export const IP_TIMEOUT_MS = 90000;
export const MAX_BATCH_SIZE = 6;
export const DISPATCH_INTERVAL_MS = 60000;
export const LOG_FILE = "logs/network.log";
export const BLACKLISTED_IPS = new Set();
export const lastSeenIPs = new Map();
export interface NetworkMessage {
  ip: string;
  location: string;
  isp: string;
  size: number;
  country: string;
}
export let messageQueue: NetworkMessage[] = [];
export interface TrafficStats {
  [ip: string]: number;
}
export let recentRequests: { ip: string; size: number; timestamp: string }[] =
  [];
export interface CountryStats {
  [country: string]: number;
}

export let trafficStats: TrafficStats = {};
export let countryStats: CountryStats = {};
