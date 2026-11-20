/** Test users created once by global-setup. All passwords are the same throwaway value on a throwaway database. */
export const PASSWORD = "Password123";
export const users = {
  admin: { name: "Ada Admin", email: "admin@e2e.test" },
  caretaker: { name: "Carla Caretaker", email: "carla@e2e.test" },
  owner: { name: "Olivia Owner", email: "olivia@e2e.test" },
  seller: { name: "Sam Shelter", email: "sam@e2e.test" },
  visitor: { name: "Vera Visitor", email: "vera@e2e.test" },
} as const;
export const LISTING_TITLE = "Friendly Beagle looking for a home";
