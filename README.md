# Network Traffic Monitor with Discord Alerts

This project monitors network traffic on a specified interface and sends alerts to a Discord channel when new packets are detected. It fetches the geographical location and ISP (Internet Service Provider) of the source IP address using the ipinfo.io API. The alerts are sent to a Discord webhook to notify you about new packets.

## Features

- Monitors network traffic using `tcpdump` on a specified interface.
- Detects and logs new network packets.
- Sends alerts to a Discord channel with the following details:
  - Source IP address.
  - Geographical location (city and country).
  - Internet Service Provider (ISP).
  - Packet size.
- Avoids sending excessive alerts for the same IP by using a cooldown period (e.g., 1 minute).
- Batch sends alerts every minute to avoid rate-limiting issues on Discord.
- Avoids sending alerts for packets with size 0 bytes.

## Requirements

- Node.js (v14.x or higher)
- `tcpdump` installed on the machine (for network traffic monitoring).
- A Discord webhook URL to send the alerts.
- `axios` library for making HTTP requests.
- `dotenv` library for managing environment variables.

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/skyholdpl/NetMonitor.git
cd NetMonitor
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a .env file in the root directory and add your Discord webhook URL:

```bash
DISCORD_WEBHOOK_URL=your_discord_webhook_url_here
```

You can get a webhook URL from Discord by creating a webhook in your server settings.

### 4. Run the project

Make sure you have `tcpdump` installed and the necessary permissions to run it. You can install it using the following command:

```bash
sudo apt-get install tcpdump
```

Then, run the project:

```bash
npm start
```

The script will start monitoring network traffic and send alerts to your Discord channel.

## How it works

### Network Traffic Monitoring:
- The script uses `tcpdump` to monitor traffic on the specified interface (e.g., `eth0`).
- It captures new packets, parses the source IP and packet size, and filters out packets with a size of 0 bytes.

### IP Information:
- For each detected IP, the script fetches its geographical location (city and country) and ISP using the `ipinfo.io` API.

### Rate Limiting:
- To prevent excessive notifications for the same IP address, the script implements a cooldown period (`IP_TIMEOUT`) to avoid sending alerts for the same IP within a short period (e.g., 1 minute).
- The script batches alerts and sends them every minute to avoid Discord rate-limiting.

### Discord Webhook:
- Alerts are sent to the specified Discord webhook, displaying details about the detected network traffic, including the source IP, location, ISP, and packet size.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- **ipinfo.io** - For providing IP geolocation and ISP information.
- **tcpdump** - For capturing network traffic.
- **axios** - For making HTTP requests.
- **dotenv** - For managing environment variables.
