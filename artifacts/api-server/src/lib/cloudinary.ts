import { v2 as cloudinary } from "cloudinary";
import { logger } from "./logger";

cloudinary.config({
  cloud_name: process.env["CLOUDINARY_CLOUD_NAME"],
  api_key: process.env["CLOUDINARY_API_KEY"],
  api_secret: process.env["CLOUDINARY_API_SECRET"],
});

export { cloudinary };

export async function uploadRecording(filePath: string, publicId: string): Promise<{ url: string; publicId: string }> {
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: "video",
    public_id: publicId,
    folder: "meetspace/recordings",
  });
  logger.info({ publicId, url: result.secure_url }, "Recording uploaded to Cloudinary");
  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteRecordingFromCloud(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
  logger.info({ publicId }, "Recording deleted from Cloudinary");
}
