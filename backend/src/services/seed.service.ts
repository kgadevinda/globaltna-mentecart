import { countServices, insertServices } from "../repositories/service.repository";
import { insertSlotInventory } from "../repositories/slot-inventory.repository";
import { buildSeedServices } from "../data/seed-services";

export async function seedCatalogIfEmpty(): Promise<boolean> {
  const serviceCount = await countServices();

  if (serviceCount > 0) {
    return false;
  }

  const services = buildSeedServices();
  const insertedServices = await insertServices(
    services.map((service) => ({
      title: service.title,
      description: service.description,
      price: service.price,
      durationMinutes: service.durationMinutes,
      category: service.category,
      imageUrl: service.imageUrl,
      slotCapacity: service.slotCapacity,
      slots: service.slots,
    })) as never,
  );

  await insertSlotInventory(
    insertedServices.flatMap((service) =>
      service.slots.map((slot) => ({
        serviceId: service._id,
        startsAt: slot.startsAt,
        capacity: slot.capacity,
        reservedCount: 0,
        bookedCount: 0,
      })),
    ),
  );

  return true;
}
