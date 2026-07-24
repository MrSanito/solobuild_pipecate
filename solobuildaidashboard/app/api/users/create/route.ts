import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import dbConnect from "@/lib/mongodb";
import { Client } from "@/lib/models";

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the endpoint
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local', {
      status: 500
    });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    
    await dbConnect();
    
    // Check if client already exists in our DB
    const exists = await Client.findOne({ clerkId: id });

    if (exists) {
      return Response.json({ success: true, message: 'User already exists' });
    }

    const email = email_addresses[0]?.email_address || "";
    const firstName = first_name || "";
    const lastName = last_name || "";
    const name = `${firstName} ${lastName}`.trim() || email.split("@")[0];

    // Generate a unique slug from the email
    const slug = email.split("@")[0].replace(/[^a-z0-9]/gi, "-").toLowerCase();

    await Client.create({
      clerkId: id,
      name,
      slug,
      email,
      plan: "free",
      credits: 0,
    });
    
    console.log(`User ${id} created in database.`);
  }

  return new Response('', { status: 200 });
}

