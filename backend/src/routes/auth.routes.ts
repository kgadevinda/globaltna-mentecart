import { Router } from "express";

import { loginController, meController, signupController } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import { loginSchema, signupSchema } from "../validators/auth.validators";

export const authRouter = Router();

authRouter.post("/signup", validateBody(signupSchema), asyncHandler(signupController));
authRouter.post("/login", validateBody(loginSchema), asyncHandler(loginController));
authRouter.get("/me", requireAuth, asyncHandler(meController));
