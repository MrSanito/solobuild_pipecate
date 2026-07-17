import { Client } from "@upstash/qstash";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from the dashboard directory
const envPath = path.resolve(__dirname, ".env.local");
console.log("Loading environment from:", envPath);

try {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
} catch (err) {
  console.error("Could not read .env.local file:", err);
}

const token = process.env.QSTASH_TOKEN;
const url = process.env.QSTASH_URL;

if (!token) {
  console.error("QSTASH_TOKEN is missing from .env.local");
  process.exit(1);
}

const client = new Client({
  token,
  baseUrl: url,
});

async function getNgrokUrl() {
  try {
    const res = await fetch("http://localhost:4040/api/tunnels");
    const data = await res.json();
    const publicUrl = data.tunnels[0].public_url;
    console.log("Found active ngrok URL from local API:", publicUrl);
    return publicUrl;
  } catch (err) {
    console.log("Could not fetch ngrok URL from local API, using fallback from env:", process.env.PUBLIC_URL);
    return process.env.PUBLIC_URL;
  }
}

const jokes = [
  "Why did the AI cross the road? To optimize the path to the other side. 🤖",
  "There are 10 types of people in the world: those who understand binary, and those who don't. 💻",
  "An AI developer's favorite drink? Java! (But typescript is also acceptable) ☕",
  "Sleep? Is that a new npm package? 😴",
  "My code doesn't work and I don't know why... My code works and I don't know why. 🙃",
  "Knock knock. Who's there? (extremely long pause)... Asynchronous processing! ⌛",
  "R2-D2 walks into a bar, the bartender says 'We don't serve your kind here.' R2 says: 'Beep boop!' 🤖🍻",
  "Hardware: The parts of a computer system that can be kicked. 🖥️👟",
  "How many programmers does it take to change a light bulb? None, that's a hardware problem. 💡",
  "I would love to change the world, but they won't give me the source code. 🌍🔐"
];

async function run() {
  const ngrokUrl = await getNgrokUrl();
  if (!ngrokUrl) {
    console.error("Could not find a valid PUBLIC_URL / ngrok URL.");
    process.exit(1);
  }

  const endpoint = `${ngrokUrl}/api/process`;
  console.log(`Target QStash endpoint: ${endpoint}`);

  for (let i = 0; i < 10; i++) {
    const delay = `${i + 1}m`;
    const body = {
      taskNumber: i + 1,
      joke: jokes[i],
      timestamp: new Date().toISOString()
    };

    console.log(`Publishing task ${i + 1}/10 with delay ${delay}...`);
    try {
      const res = await client.publishJSON({
        url: endpoint,
        body,
        delay,
      });
      console.log(`Task ${i + 1} published successfully. Message ID:`, res.messageId);
    } catch (error) {
      console.error(`Failed to publish task ${i + 1}:`, error);
    }
  }

  console.log("All 10 tasks published!");
}

run();
