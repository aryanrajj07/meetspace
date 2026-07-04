import { Router, type IRouter } from "express";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import { Meeting } from "../models/Meeting";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { cacheGet, cacheSet, cacheDel } from "../lib/redis";

const router: IRouter = Router();
const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

function formatMeeting(m: InstanceType<typeof Meeting>) {
  return {
    id: m._id.toString(),
    title: m.title,
    hostId: m.hostId,
    hostName: m.hostName ?? null,
    roomCode: m.roomCode,
    status: m.status,
    scheduledAt: m.scheduledAt?.toISOString() ?? null,
    startedAt: m.startedAt?.toISOString() ?? null,
    endedAt: m.endedAt?.toISOString() ?? null,
    duration: m.duration ?? null,
    participants: (m.participants || []).map((p) => ({
      userId: p.userId,
      name: p.name,
      joinedAt: p.joinedAt.toISOString(),
      leftAt: p.leftAt?.toISOString() ?? null,
    })),
    transcript: m.transcript ?? null,
    summary: m.summary ?? null,
    recordingUrl: m.recordingUrl ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

router.get("/meetings/stats", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const cacheKey = `stats:${userId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    res.json(JSON.parse(cached));
    return;
  }

  const meetings = await Meeting.find({
    $or: [{ hostId: userId }, { "participants.userId": userId }],
  });

  const totalMeetings = meetings.length;
  const totalDuration = meetings.reduce((sum, m) => sum + (m.duration ?? 0), 0);
  const upcomingCount = meetings.filter((m) => m.status === "scheduled").length;
  const hostedCount = meetings.filter((m) => m.hostId === userId).length;

  const stats = { totalMeetings, totalDuration, upcomingCount, hostedCount };
  await cacheSet(cacheKey, JSON.stringify(stats), 60);
  res.json(stats);
});

router.get("/meetings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const meetings = await Meeting.find({
    $or: [{ hostId: userId }, { "participants.userId": userId }],
  }).sort({ createdAt: -1 });
  res.json(meetings.map(formatMeeting));
});

router.post("/meetings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { title, scheduledAt } = req.body;
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const roomCode = uuidv4().replace(/-/g, "").slice(0, 10).toUpperCase();
  const meeting = await Meeting.create({
    title,
    hostId: req.userId,
    hostName: req.body.hostName || "Host",
    roomCode,
    status: scheduledAt ? "scheduled" : "active",
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    startedAt: scheduledAt ? undefined : new Date(),
  });

  await cacheDel(`stats:${req.userId}`);
  res.status(201).json(formatMeeting(meeting));
});

router.get("/meetings/:meetingId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.meetingId) ? req.params.meetingId[0] : req.params.meetingId;
  const meeting = await Meeting.findById(raw);
  if (!meeting) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }
  res.json(formatMeeting(meeting));
});

router.patch("/meetings/:meetingId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.meetingId) ? req.params.meetingId[0] : req.params.meetingId;
  const meeting = await Meeting.findById(raw);
  if (!meeting) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }
  if (meeting.hostId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { title, scheduledAt } = req.body;
  if (title) meeting.title = title;
  if (scheduledAt) meeting.scheduledAt = new Date(scheduledAt);
  await meeting.save();
  res.json(formatMeeting(meeting));
});

router.delete("/meetings/:meetingId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.meetingId) ? req.params.meetingId[0] : req.params.meetingId;
  const meeting = await Meeting.findById(raw);
  if (!meeting) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }
  if (meeting.hostId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await meeting.deleteOne();
  await cacheDel(`stats:${req.userId}`);
  res.sendStatus(204);
});
router.patch(
  "/meetings/:meetingId/transcript",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const raw = Array.isArray(req.params.meetingId)
      ? req.params.meetingId[0]
      : req.params.meetingId;

    const meeting = await Meeting.findById(raw);

    if (!meeting) {
      res.status(404).json({
        error: "Meeting not found",
      });
      return;
    }

    meeting.transcript = req.body.transcript;

    await meeting.save();

    res.json(formatMeeting(meeting));
  }
);
router.post("/meetings/:meetingId/end", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.meetingId) ? req.params.meetingId[0] : req.params.meetingId;
  const meeting = await Meeting.findById(raw);
  if (!meeting) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }

  const endedAt = new Date();
  meeting.status = "ended";
  meeting.endedAt = endedAt;
  if (meeting.startedAt) {
    meeting.duration = Math.floor((endedAt.getTime() - meeting.startedAt.getTime()) / 1000);
  }

  if (meeting.transcript && !meeting.summary) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert meeting summarizer. Provide a concise, structured summary of the meeting transcript. Include: key decisions made, action items, and main discussion topics.",
          },
          {
            role: "user",
            content: `Summarize this meeting transcript:\n\n${meeting.transcript}`,
          },
        ],
        max_tokens: 500,
      });
      meeting.summary = completion.choices[0]?.message?.content ?? undefined;
    } catch {
      // summary generation is best-effort
    }
  }

  await meeting.save();
  await cacheDel(`stats:${req.userId}`);
  res.json(formatMeeting(meeting));
});

router.get("/meetings/:meetingId/summary", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.meetingId) ? req.params.meetingId[0] : req.params.meetingId;
  const meeting = await Meeting.findById(raw);
  if (!meeting) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }
  res.json({
    meetingId: meeting._id.toString(),
    summary: meeting.summary ?? null,
    transcript: meeting.transcript ?? null,
    duration: meeting.duration ?? null,
    participantCount: meeting.participants.length,
  });
});

export default router;
