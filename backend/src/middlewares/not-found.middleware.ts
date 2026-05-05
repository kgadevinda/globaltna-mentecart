import type { Request, Response } from "express";

export function notFoundMiddleware(_req: Request, res: Response): void {
  res.status(404).json({
    statusCode: 404,
    message: "Route not found",
    errorCode: "ROUTE_NOT_FOUND",
  });
}
