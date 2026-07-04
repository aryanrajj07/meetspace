import { Router, type IRouter } from "express";
import { Recording } from "../models/Recording";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { deleteRecordingFromCloud } from "../lib/cloudinary";
import multer from "multer";
import fs from "fs";
import { uploadRecording } from "../lib/cloudinary";

const router: IRouter = Router();
const upload = multer({ dest: "uploads/" });

function formatRecording(r: InstanceType<typeof Recording>) {
  return {
    id: r._id.toString(),
    meetingId: r.meetingId,
    meetingTitle: r.meetingTitle,
    url: r.url,
    publicId: r.publicId ?? null,
    duration: r.duration ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}
router.post(
  "/recordings/upload",
  requireAuth,
  upload.single("recording"),
  async (req: AuthRequest, res): Promise<void> => {
    try {
      if (!("file" in req) || !req.file) {
        res.status(400).json({ error: "Recording file is required" });
        return;
      }

      const { meetingId, meetingTitle, duration } = req.body;

      const publicId = `meeting-${Date.now()}`;

      const uploaded = await uploadRecording(
        req.file.path,
        publicId
      );

      fs.unlinkSync(req.file.path);

      const recording = await Recording.create({
        meetingId,
        meetingTitle,
        userId: req.userId,
        url: uploaded.url,
        publicId: uploaded.publicId,
        duration: Number(duration) || 0,
      });

      res.status(201).json(formatRecording(recording));
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Failed to upload recording",
      });
    }
  }
);
router.get("/recordings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const recordings = await Recording.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(recordings.map(formatRecording));
});

router.get("/recordings/:recordingId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.recordingId) ? req.params.recordingId[0] : req.params.recordingId;
  const recording = await Recording.findOne({ _id: raw, userId: req.userId });
  if (!recording) {
    res.status(404).json({ error: "Recording not found" });
    return;
  }
  res.json(formatRecording(recording));
});

router.delete("/recordings/:recordingId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.recordingId) ? req.params.recordingId[0] : req.params.recordingId;
  const recording = await Recording.findOne({ _id: raw, userId: req.userId });
  if (!recording) {
    res.status(404).json({ error: "Recording not found" });
    return;
  }

  if (recording.publicId) {
    try {
      await deleteRecordingFromCloud(recording.publicId);
    } catch {
      // best-effort cloud deletion
    }
  }

  await recording.deleteOne();
  res.sendStatus(204);
});

export default router;
