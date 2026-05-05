import { Types } from "mongoose";

import type { UserRole } from "../constants/user";
import { UserModel, type UserDocument } from "../models/user.model";

export async function createUser(data: {
  name?: string;
  email: string;
  passwordHash: string;
  bookingCapPerDay?: number;
  role?: UserRole;
}): Promise<UserDocument> {
  return UserModel.create(data);
}

export async function findUserByEmail(email: string): Promise<UserDocument | null> {
  return UserModel.findOne({ email }).exec();
}

export async function findUserByEmailWithPassword(email: string): Promise<UserDocument | null> {
  return UserModel.findOne({ email }).select("+passwordHash").exec();
}

export async function findUserById(userId: Types.ObjectId): Promise<UserDocument | null> {
  return UserModel.findById(userId).exec();
}
