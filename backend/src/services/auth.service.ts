import bcrypt from "bcryptjs";
import { Types } from "mongoose";

import { AppError } from "../errors/app-error";
import {
  createUser,
  findUserByEmail,
  findUserByEmailWithPassword,
  findUserById,
} from "../repositories/user.repository";
import { serializeUser } from "../utils/serializers";
import { signToken } from "./token.service";

type AuthInput = {
  name?: string;
  email: string;
  password: string;
};

export async function signup(input: AuthInput) {
  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    throw new AppError(409, "Email address is already registered", "EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await createUser({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  const token = signToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role ?? "customer",
  });

  return {
    token,
    user: serializeUser(user),
  };
}

export async function login(input: Omit<AuthInput, "name">) {
  const user = await findUserByEmailWithPassword(input.email);

  if (!user) {
    throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const matches = await bcrypt.compare(input.password, user.passwordHash);

  if (!matches) {
    throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const token = signToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role ?? "customer",
  });

  return {
    token,
    user: serializeUser(user),
  };
}

export async function getCurrentUser(userId: string) {
  const user = await findUserById(new Types.ObjectId(userId));

  if (!user) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  return serializeUser(user);
}
