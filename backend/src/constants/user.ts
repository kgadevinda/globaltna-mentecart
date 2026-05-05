export const userRoles = ["customer", "admin"] as const;

export type UserRole = (typeof userRoles)[number];
