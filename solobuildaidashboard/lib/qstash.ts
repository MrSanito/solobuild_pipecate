import { Client } from "@upstash/qstash";

const qstashToken = process.env.QSTASH_TOKEN;
const qstashUrl = process.env.QSTASH_URL;

if (!qstashToken) {
  throw new Error("QSTASH_TOKEN is not defined in environment variables");
}

export const qstashClient = new Client({
  token: qstashToken,
  baseUrl: qstashUrl, // Optional: defaults to the standard QStash production endpoint if undefined
});
