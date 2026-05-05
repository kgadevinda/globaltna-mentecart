import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";

import { logger } from "../config/logger";
import { AppError } from "../errors/app-error";

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      statusCode: error.statusCode,
      message: error.message,
      errorCode: error.errorCode,
      details: error.details,
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      statusCode: 400,
      message: "Validation failed",
      errorCode: "VALIDATION_ERROR",
      details: error.flatten(),
    });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({
      statusCode: 400,
      message: "Invalid identifier",
      errorCode: "INVALID_ID",
    });
    return;
  }

  logger.error({ err: error }, "Unhandled error");

  res.status(500).json({
    statusCode: 500,
    message: "Internal server error",
    errorCode: "INTERNAL_SERVER_ERROR",
  });
}
