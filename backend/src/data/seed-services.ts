export type SeedService = {
  title: string;
  description: string;
  price: number;
  durationMinutes: number;
  category: string;
  imageUrl: string;
  slotCapacity: number;
  slots: Array<{
    startsAt: Date;
    capacity: number;
  }>;
};

export function buildSeedServices(): SeedService[] {
  return [
    {
      title: "Sparkle Home Reset",
      description: "Two-hour deep cleaning session for apartments and small homes.",
      price: 95,
      durationMinutes: 120,
      category: "home_cleaning",
      imageUrl:
        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
      slotCapacity: 3,
      slots: buildSlots([9, 13, 17], 3),
    },
    {
      title: "Rapid Plumbing Rescue",
      description: "Emergency plumbing visit for leaks, blockages, and fixture swaps.",
      price: 120,
      durationMinutes: 90,
      category: "plumbing",
      imageUrl:
        "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1200&q=80",
      slotCapacity: 2,
      slots: buildSlots([10, 14, 18], 2),
    },
    {
      title: "STEM Tutor Sprint",
      description: "One-on-one math and science tutoring focused on exam prep and homework support.",
      price: 45,
      durationMinutes: 60,
      category: "tutoring",
      imageUrl:
        "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
      slotCapacity: 4,
      slots: buildSlots([8, 12, 16, 19], 4),
    },
    {
      title: "Glow Studio Appointment",
      description: "Beauty appointment for makeup, styling, or skincare consultations.",
      price: 80,
      durationMinutes: 75,
      category: "beauty",
      imageUrl:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
      slotCapacity: 2,
      slots: buildSlots([11, 15, 18], 2),
    },
  ];
}

function buildSlots(hours: number[], capacity: number) {
  const slots: Array<{ startsAt: Date; capacity: number }> = [];
  const now = new Date();

  for (let dayOffset = 1; dayOffset <= 5; dayOffset += 1) {
    for (const hour of hours) {
      slots.push({
        startsAt: new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + dayOffset,
            hour,
            0,
            0,
            0,
          ),
        ),
        capacity,
      });
    }
  }

  return slots;
}
