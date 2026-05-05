import { Router } from "express";

import {
  addCartItemController,
  getCartController,
  removeCartItemController,
  updateCartItemController,
} from "../controllers/cart.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import { addCartItemSchema, updateCartItemSchema } from "../validators/cart.validators";

export const cartRouter = Router();

cartRouter.use(requireAuth);
cartRouter.get("/", asyncHandler(getCartController));
cartRouter.post("/items", validateBody(addCartItemSchema), asyncHandler(addCartItemController));
cartRouter.patch(
  "/items/:itemId",
  validateBody(updateCartItemSchema),
  asyncHandler(updateCartItemController),
);
cartRouter.delete("/items/:itemId", asyncHandler(removeCartItemController));
