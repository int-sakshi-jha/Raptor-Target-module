import type { PlantComponentRow } from "@/services/operations/plantAPI";
import {
  coerceTagTemplateTagMap,
  type TagTemplateOption,
} from "@/services/operations/tagTemplateAPI";
import { normalizeComponentType } from "@/pages/plant/plant-components/shared";

const TAG_MAP_META_KEYS = new Set([
  "soft_tag",
  "soft_tags",
  "vd",
  "vds",
  "parameters",
  "parameter",
  "params",
]);

export interface WidgetTagBindingItem {
  component_id: string;
  component_name?: string | null;
  tag_ids: string[];
}

export interface TagKeyFieldOption extends TagTemplateOption {
  kind: "static" | "soft_tag" | "dynamic";
}

/** Logical keys from a tag template tag_map (matches backend tag-map-keys extraction). */
export function listTagTemplateLogicalKeys(
  rawTagMap: unknown,
  componentType?: string,
): string[] {
  const tagMap = coerceTagTemplateTagMap(rawTagMap);
  const normalizedType = normalizeComponentType(componentType).toUpperCase();

  if (normalizedType === "DC" || normalizedType === "DC_CHANNEL" || normalizedType === "TRC") {
    const parameters = tagMap.parameters;
    if (Array.isArray(parameters)) {
      return [
        ...new Set(
          parameters
            .map((entry) => {
              if (!entry || typeof entry !== "object") return null;
              const internalName = (entry as { internal_name?: unknown }).internal_name;
              return typeof internalName === "string" && internalName.trim()
                ? internalName.trim()
                : null;
            })
            .filter((key): key is string => Boolean(key)),
        ),
      ];
    }
  }

  const keys: string[] = [];
  for (const [key, value] of Object.entries(tagMap)) {
    if (TAG_MAP_META_KEYS.has(key)) continue;
    if (typeof value === "string" || value == null || typeof value === "number") {
      keys.push(key);
    }
  }

  const softTags = tagMap.soft_tag ?? tagMap.soft_tags;
  if (softTags && typeof softTags === "object" && !Array.isArray(softTags)) {
    keys.push(...Object.keys(softTags as Record<string, unknown>));
  }

  return [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
}

export function buildTagKeyFieldOptions(rawTagMap: unknown): TagKeyFieldOption[] {
  const tagMap = coerceTagTemplateTagMap(rawTagMap);
  const options: TagKeyFieldOption[] = [];

  for (const [key, value] of Object.entries(tagMap)) {
    if (TAG_MAP_META_KEYS.has(key)) continue;
    if (typeof value === "string" || value == null || typeof value === "number") {
      const external = typeof value === "string" && value.trim() ? value.trim() : null;
      options.push({
        value: key,
        label: external ? `${key} → ${external}` : key,
        kind: "static",
      });
    }
  }

  const softTags = tagMap.soft_tag ?? tagMap.soft_tags;
  if (softTags && typeof softTags === "object" && !Array.isArray(softTags)) {
    for (const key of Object.keys(softTags as Record<string, unknown>)) {
      options.push({
        value: key,
        label: `${key} (computed)`,
        kind: "soft_tag",
      });
    }
  }

  const parameters = tagMap.parameters;
  if (Array.isArray(parameters)) {
    for (const entry of parameters) {
      if (!entry || typeof entry !== "object") continue;
      const internalName = (entry as { internal_name?: unknown }).internal_name;
      const externalName = (entry as { external_name?: unknown }).external_name;
      if (typeof internalName !== "string" || !internalName.trim()) continue;
      const internal = internalName.trim();
      const external =
        typeof externalName === "string" && externalName.trim() ? externalName.trim() : null;
      options.push({
        value: internal,
        label: external ? `${internal} → ${external}` : internal,
        kind: "dynamic",
      });
    }
  }

  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
}

export function buildTagBindingsFromTemplate(args: {
  components: readonly PlantComponentRow[];
  tagTemplateId: string;
  tagKeys: string[];
  componentType?: string;
}): WidgetTagBindingItem[] {
  const { components, tagTemplateId, tagKeys, componentType } = args;
  const normalizedType = componentType ? normalizeComponentType(componentType) : "";

  const matched = components.filter((component) => {
    if (component.tag_template_id !== tagTemplateId) return false;
    if (!normalizedType) return true;
    return normalizeComponentType(component.component_type) === normalizedType;
  });

  return matched.map((component) => ({
    component_id: component.id,
    component_name: component.component_name ?? component.component_code,
    tag_ids: tagKeys,
  }));
}

export function widgetShowHeading(config: Record<string, unknown> | undefined): boolean {
  return config?.showHeading === true;
}
