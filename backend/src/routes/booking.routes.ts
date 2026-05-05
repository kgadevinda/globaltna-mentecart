import { Router } from "express";

import {
  cancelBookingController,
  checkoutController,
  completeBookingController,
  getBookingController,
  listBookingsController,
} from "../controllers/booking.controller";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import { checkoutSchema, completeBookingSchema } from "../validators/booking.validators";

export const bookingRouter = Router();

bookingRouter.use(requireAuth);
bookingRouter.post("/checkout", validateBody(checkoutSchema), asyncHandler(checkoutController));
bookingRouter.get("/", asyncHandler(listBookingsController));
bookingRouter.get("/:id", asyncHandler(getBookingController));
bookingRouter.post("/:id/cancel", asyncHandler(cancelBookingController));
bookingRouter.post(
  "/:id/complete",
  requireAdmin,
  validateBody(completeBookingSchema),
  asyncHandler(completeBookingController),
);
