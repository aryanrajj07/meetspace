import mongoose, { Document, Schema } from "mongoose";

export interface IParticipant {
  userId: string;
  name: string;
  joinedAt: Date;
  leftAt?: Date;
}

export interface IMeeting extends Document {
  title: string;
  hostId: string;
  hostName: string;
  roomCode: string;
  status: "scheduled" | "active" | "ended";
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  participants: IParticipant[];
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
  },
  { _id: false }
);

const MeetingSchema = new Schema<IMeeting>(
  {
    title: { type: String, required: true, trim: true },
    hostId: { type: String, required: true },
    hostName: { type: String, required: true },
    roomCode: { type: String, required: true, unique: true },
    status: { type: String, enum: ["scheduled", "active", "ended"], default: "scheduled" },
    scheduledAt: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    duration: { type: Number },
    participants: [ParticipantSchema],
    transcript: { type: String },
    summary: { type: String },
    recordingUrl: { type: String },
  },
  { timestamps: true }
);

export const Meeting = mongoose.model<IMeeting>("Meeting", MeetingSchema);
