import type { JwtPayload } from "../services/token.service";

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
      validatedQuery?: unknown;
    }
  }
}

export {};
