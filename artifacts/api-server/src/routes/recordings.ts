import { Router, type IRouter } from "express";
import { Recording } from "../models/Recording";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { deleteRecordingFromCloud } from "../lib/cloudinary";

const router: IRouter = Router();

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
