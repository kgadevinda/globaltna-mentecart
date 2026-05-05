import { Router } from "express";

import { getServiceDetailController, listServicesController } from "../controllers/service.controller";
import { validateQuery } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import { serviceListQuerySchema } from "../validators/service.validators";

export const serviceRouter = Router();

serviceRouter.get("/", validateQuery(serviceListQuerySchema), asyncHandler(listServicesController));
serviceRouter.get("/:id", asyncHandler(getServiceDetailController));
