// Loads every section module. Each section registers its own scenes + audio events.
// Section folders are OWNED by one agent each (see docs/SECTIONS.md). Do not cross-edit.
export const SECTION_IDS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'];
export async function load(only) {
  for (const id of SECTION_IDS) {
    if (only && !only.includes(id)) continue;
    await import(`./${id}/index.js`);
  }
}
