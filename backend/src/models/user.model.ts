import { model, Schema, type HydratedDocument, type InferSchemaType } from "mongoose";

import { env } from "../config/env";
import { userRoles } from "../constants/user";

const userSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    bookingCapPerDay: {
      type: Number,
      required: true,
      default: env.maxBookingsPerDay,
      min: 1,
    },
    role: {
      type: String,
      enum: userRoles,
      required: true,
      default: "customer",
    },
  },
  {
    timestamps: true,
  },
);

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const UserModel = model("User", userSchema);
