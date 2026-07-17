import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadRecording(filePath: string, publicId: string): Promise<string> {
  try {
    console.log(`[CLOUDINARY] Uploading file ${filePath} to Cloudinary...`);
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "video", // audio is treated as video/audio in Cloudinary
      public_id: `recordings/${publicId}`,
      overwrite: true,
    });
    console.log(`[CLOUDINARY] Upload successful! Secure URL: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error("[CLOUDINARY] Upload failed:", error);
    throw error;
  }
}
