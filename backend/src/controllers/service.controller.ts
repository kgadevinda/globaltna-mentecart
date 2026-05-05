import type { Request, Response } from "express";

import { getServiceDetail, getServices } from "../services/service.service";
import type { z } from "zod";

import type { serviceListQuerySchema } from "../validators/service.validators";

export async function listServicesController(req: Request, res: Response) {
  const result = await getServices(
    req.validatedQuery as z.infer<typeof serviceListQuerySchema>,
  );
  res.status(200).json(result);
}

export async function getServiceDetailController(req: Request, res: Response) {
  const service = await getServiceDetail(String(req.params.id));
  res.status(200).json({ service });
}
