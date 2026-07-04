import mongoose, { Document, Schema } from "mongoose";

export interface ITeamMember {
  userId: string;
  name: string;
  email: string;
}

export interface ITeam extends Document {
  name: string;
  ownerId: string;
  members: ITeamMember[];
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  { _id: false }
);

const TeamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ownerId: {
      type: String,
      required: true,
    },
    members: [TeamMemberSchema],
  },
  {
    timestamps: true,
  }
);

export const Team = mongoose.model<ITeam>("Team", TeamSchema);