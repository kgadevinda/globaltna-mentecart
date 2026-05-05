import { Types } from "mongoose";

import { AppError } from "../errors/app-error";
import { findServiceById, listServices } from "../repositories/service.repository";
import { listSlotInventoryForService } from "../repositories/slot-inventory.repository";
import { serializeServiceDetail, serializeServiceSummary } from "../utils/serializers";
import { cleanupExpiredHolds } from "./capacity.service";

type ServiceListInput = {
  page: number;
  limit: number;
  category?: string;
  search?: string;
};

export async function getServices(input: ServiceListInput) {
  await cleanupExpiredHolds();

  const { items, total } = await listServices(input);

  return {
    items: items.map(serializeServiceSummary),
    total,
    page: input.page,
    limit: input.limit,
    hasMore: input.page * input.limit < total,
  };
}

export async function getServiceDetail(serviceId: string) {
  await cleanupExpiredHolds();

  const service = await findServiceById(new Types.ObjectId(serviceId));

  if (!service) {
    throw new AppError(404, "Service not found", "SERVICE_NOT_FOUND");
  }

  const slotInventory = await listSlotInventoryForService(service._id);

  return serializeServiceDetail(service, slotInventory);
}
