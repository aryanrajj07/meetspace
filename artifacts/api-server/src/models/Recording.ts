import mongoose, { Document, Schema } from "mongoose";

export interface IRecording extends Document {
  meetingId: string;
  meetingTitle: string;
  userId: string;
  url: string;
  publicId?: string;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}

const RecordingSchema = new Schema<IRecording>(
  {
    meetingId: { type: String, required: true },
    meetingTitle: { type: String, required: true },
    userId: { type: String, required: true },
    url: { type: String, required: true },
    publicId: { type: String },
    duration: { type: Number },
  },
  { timestamps: true }
);

export const Recording = mongoose.model<IRecording>("Recording", RecordingSchema);
