import { useMemo } from "react";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { useGetTagTemplateDetailsQuery } from "@/services/operations/tagTemplateAPI";
import {
  buildTagBindingsFromTemplate,
  buildTagKeyFieldOptions,
  listTagTemplateLogicalKeys,
} from "../core/tagTemplateRuntime";
import { parseTagKeys } from "../core/tagGroupRuntime";

export function useTagTemplateWidgetData(args: {
  plantId?: string;
  tagTemplateId?: unknown;
  tagKeys?: unknown;
  componentType?: unknown;
}) {
  const { plantId, tagTemplateId, tagKeys, componentType } = args;
  const templateId =
    typeof tagTemplateId === "string" && tagTemplateId.trim() ? tagTemplateId.trim() : "";

  const live = usePlantLiveData({ plantId, enabled: Boolean(plantId) });

  const templateQuery = useGetTagTemplateDetailsQuery(templateId, {
    enabled: Boolean(templateId),
  });

  const explicitTagKeys = useMemo(() => parseTagKeys(tagKeys), [tagKeys]);

  const templateTagMap = templateQuery.data?.tag_map ?? {};

  const templateKeys = useMemo(
    () => listTagTemplateLogicalKeys(templateTagMap),
    [templateTagMap],
  );

  const tagKeyOptions = useMemo(
    () => buildTagKeyFieldOptions(templateTagMap),
    [templateTagMap],
  );

  const resolvedTagKeys = useMemo(() => {
    if (explicitTagKeys.length > 0) return explicitTagKeys;
    return templateKeys;
  }, [explicitTagKeys, templateKeys]);

  const resolvedComponentType =
    typeof componentType === "string" && componentType.trim() ? componentType.trim() : undefined;

  const tagConfig = useMemo(() => {
    if (!templateId) return [];
    return buildTagBindingsFromTemplate({
      components: live.components,
      tagTemplateId: templateId,
      tagKeys: resolvedTagKeys,
      componentType: resolvedComponentType,
    });
  }, [live.components, resolvedComponentType, resolvedTagKeys, templateId]);

  return {
    live,
    tagConfig,
    resolvedTagKeys,
    templateKeys,
    tagKeyOptions,
    hasTagTemplate: Boolean(templateId),
    isTagTemplateLoading: templateQuery.isLoading,
    tagTemplateName: templateQuery.data?.name ?? null,
  };
}
