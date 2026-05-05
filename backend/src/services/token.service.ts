import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { userRoles, type UserRole } from "../constants/user";

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (typeof decoded === "string" || !decoded.sub || !decoded.email) {
    throw new Error("Invalid token payload");
  }

  const role =
    typeof decoded.role === "string" && userRoles.includes(decoded.role as UserRole)
      ? (decoded.role as UserRole)
      : "customer";

  return {
    sub: String(decoded.sub),
    email: String(decoded.email),
    role,
  };
}
