import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error";
import type { JwtPayload } from "../services/token.service";
import { verifyToken } from "../services/token.service";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    req.auth = getAuthenticatedUser(req);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  try {
    const auth = getAuthenticatedUser(req);

    if (auth.role !== "admin") {
      throw new AppError(403, "Admin access is required for this route", "AUTH_FORBIDDEN");
    }

    req.auth = auth;
    next();
  } catch (error) {
    next(error);
  }
}

function getAuthenticatedUser(req: Request): JwtPayload {
  if (req.auth) {
    return req.auth;
  }

  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new AppError(401, "Missing bearer token", "AUTH_TOKEN_MISSING");
  }

  const token = authorization.replace("Bearer ", "").trim();

  try {
    return verifyToken(token);
  } catch {
    throw new AppError(401, "Invalid or expired token", "AUTH_TOKEN_INVALID");
  }
}
