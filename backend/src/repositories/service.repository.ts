import { Types } from "mongoose";

import { ServiceModel, type ServiceDocument } from "../models/service.model";

type ListServiceOptions = {
  page: number;
  limit: number;
  category?: string;
  search?: string;
};

export async function listServices(options: ListServiceOptions): Promise<{
  items: ServiceDocument[];
  total: number;
}> {
  const query: Record<string, unknown> = {};

  if (options.category) {
    query.category = new RegExp(`^${escapeRegex(options.category)}$`, "i");
  }

  if (options.search) {
    query.title = new RegExp(escapeRegex(options.search), "i");
  }

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    ServiceModel.find(query).sort({ title: 1 }).skip(skip).limit(options.limit).exec(),
    ServiceModel.countDocuments(query).exec(),
  ]);

  return { items, total };
}

export async function findServiceById(serviceId: Types.ObjectId): Promise<ServiceDocument | null> {
  return ServiceModel.findById(serviceId).exec();
}

export async function countServices(): Promise<number> {
  return ServiceModel.countDocuments().exec();
}

export async function insertServices(
  services: Array<{
    title: string;
    description: string;
    price: number;
    durationMinutes: number;
    category: string;
    imageUrl: string;
    slotCapacity: number;
    slots: Array<{ startsAt: Date; capacity: number }>;
  }>,
): Promise<ServiceDocument[]> {
  return (await ServiceModel.insertMany(services)) as unknown as ServiceDocument[];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
