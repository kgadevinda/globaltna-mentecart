import express, { Router } from "express";

import {
  payHereCancelController,
  payHereCheckoutPageController,
  payHereNotifyController,
  payHereReturnController,
} from "../controllers/payment.controller";
import { asyncHandler } from "../utils/async-handler";

export const paymentRouter = Router();

paymentRouter.get("/payhere/checkout/:token", asyncHandler(payHereCheckoutPageController));
paymentRouter.get("/payhere/return", asyncHandler(payHereReturnController));
paymentRouter.get("/payhere/cancel", asyncHandler(payHereCancelController));
paymentRouter.post(
  "/payhere/notify",
  express.raw({ type: "application/x-www-form-urlencoded" }),
  asyncHandler(payHereNotifyController),
);
