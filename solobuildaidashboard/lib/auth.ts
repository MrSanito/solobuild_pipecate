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
