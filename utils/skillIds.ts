/** Normalize Mongo/API ids to a stable string for comparisons. */
export function normalizeSkillId(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.$oid === 'string') return obj.$oid;
    if (obj._id != null) return normalizeSkillId(obj._id);
  }
  return String(value).trim();
}

export function parseSkillIds(skills: unknown): string[] {
  if (!Array.isArray(skills)) return [];
  const unique = new Set<string>();
  for (const item of skills) {
    const id = normalizeSkillId(
      typeof item === 'object' && item !== null && '_id' in item
        ? (item as { _id: unknown })._id
        : item
    );
    if (id) unique.add(id);
  }
  return Array.from(unique);
}

export function filterValidSkillIds(selectedIds: string[], categoryIds: string[]): string[] {
  const valid = new Set(categoryIds.map(normalizeSkillId).filter(Boolean));
  return selectedIds.map(normalizeSkillId).filter((id) => valid.has(id));
}
