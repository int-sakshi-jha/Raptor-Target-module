import type { PlantOperationalStatus } from "../types/dashboard.types";
import { FieldResolver } from "./FieldResolver";
import { TopicResolver } from "./TopicResolver";

export class MetricResolver {
  private readonly topics: TopicResolver;
  private readonly fields: FieldResolver;

  constructor(topics: TopicResolver, fields: FieldResolver) {
    this.topics = topics;
    this.fields = fields;
  }

  resolveStatus(
    sources: Parameters<FieldResolver["resolve"]>[1],
  ): PlantOperationalStatus {
    const raw = this.fields.resolveString("plant_status", sources)?.toLowerCase() ?? "";
    if (["active", "online", "running", "ok"].some((s) => raw.includes(s))) return "active";
    if (["inactive", "offline", "down", "fault"].some((s) => raw.includes(s))) return "inactive";
    if (["partial", "degraded", "warning"].some((s) => raw.includes(s))) return "partial";
    return "unknown";
  }

  resolveMetric(
    metricKey: string,
    sources: Parameters<FieldResolver["resolve"]>[1],
  ): number | null {
    return this.fields.resolveNumber(metricKey, sources);
  }

  getTopicResolver(): TopicResolver {
    return this.topics;
  }

  getFieldResolver(): FieldResolver {
    return this.fields;
  }
}
