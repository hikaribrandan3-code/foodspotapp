/**
 * App Config Deep Merge Utility
 *
 * Prevents cross-page clobbering when multiple modules write to
 * the branding.app_config JSONB column.
 *
 * Rules:
 * - Top-level keys are shallow-merged (new keys added, existing preserved)
 * - Nested objects are shallow-merged at one level deep
 * - Arrays and primitives are overwritten
 */
export function deepMergeAppConfig(existing = {}, updates = {}) {
  const result = { ...existing };
  for (const key of Object.keys(updates)) {
    const updateVal = updates[key];
    const existingVal = result[key];
    const bothObjects =
      updateVal &&
      typeof updateVal === 'object' &&
      !Array.isArray(updateVal) &&
      existingVal &&
      typeof existingVal === 'object' &&
      !Array.isArray(existingVal);

    if (bothObjects) {
      result[key] = { ...existingVal, ...updateVal };
    } else {
      result[key] = updateVal;
    }
  }
  return result;
}
