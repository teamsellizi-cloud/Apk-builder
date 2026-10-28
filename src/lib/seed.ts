// No fake builds or mock data.
// Only real builds initiated by the user will be stored in the database.
export async function seedInitialBuildsIfEmpty() {
  // Pure pass-through: do not insert mock builds
  return;
}
