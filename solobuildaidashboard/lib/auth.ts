import { SignJWT, jwtVerify } from 'jose';

// Define the secret key. Must be 32 bytes minimum.
const getSecretKey = () => {
  const secret = process.env.JWT_SECRET || 'solobuildai_default_development_secret_key_12345';
  return new TextEncoder().encode(secret);
};

export async function signToken(payload: { email: string; id: string; name: string }) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 24 * 60 * 60; // 24 hours

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime(exp)
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .sign(getSecretKey());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as { email: string; id: string; name: string };
  } catch (error) {
    return null;
  }
}

export async function getAuthClient(req: Request, selectFields?: string) {
  const dbConnect = (await import("@/lib/mongodb")).default;
  const { Client } = await import("@/lib/models");
  
  await dbConnect();

  let isAuthenticated = false;

  // 1. Try Authorization header first (JWT Token from custom credentials login)
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const decoded = await verifyToken(token);
    if (decoded && decoded.email) {
      isAuthenticated = true;
      let query = Client.findOne({ email: decoded.email });
      if (selectFields) {
        query = query.select(selectFields);
      }
      const client = await query;
      if (client) {
        return { client, isAuthenticated };
      }
      // If user is authenticated but not in DB, return authenticated with null client
      return { client: null, isAuthenticated };
    }
  }

  // 2. Try Clerk authentication
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (userId) {
      isAuthenticated = true;
      let query = Client.findOne({ clerkId: userId });
      if (selectFields) {
        query = query.select(selectFields);
      }
      const client = await query;
      if (client) {
        return { client, isAuthenticated };
      }
      // If user is authenticated but not in DB, return authenticated with null client
      return { client: null, isAuthenticated };
    }
  } catch (err) {
    // In case clerk auth is not configured or throws, catch and ignore
  }

  // 3. Try x-client-email header (fallback/backward compatibility)
  const clientEmail = req.headers.get("x-client-email");
  if (clientEmail) {
    isAuthenticated = true;
    let query = Client.findOne({ email: clientEmail });
    if (selectFields) {
      query = query.select(selectFields);
    }
    const client = await query;
    if (client) {
      return { client, isAuthenticated };
    }
    return { client: null, isAuthenticated };
  }

  return { client: null, isAuthenticated: false };
}
