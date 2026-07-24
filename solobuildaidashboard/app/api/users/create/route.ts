import { auth, currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import { Client } from "@/lib/models";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  // Check if client already exists in our DB
  const exists = await Client.findOne({ clerkId: userId });

  if (exists) {
    return Response.json({ success: true });
  }

  // Fetch full user profile from Clerk
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress || "";
  const firstName = clerkUser?.firstName || "";
  const lastName = clerkUser?.lastName || "";
  const name = `${firstName} ${lastName}`.trim() || email.split("@")[0];

  // Generate a unique slug from the email
  const slug = email.split("@")[0].replace(/[^a-z0-9]/gi, "-").toLowerCase();

  await Client.create({
    clerkId: userId,
    name,
    slug,
    email,
    plan: "free",
    credits: 0,
  });

  return Response.json({ success: true });
}
