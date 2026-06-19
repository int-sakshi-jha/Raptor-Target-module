import type { DashboardTopicConfig } from "../types/dashboard.types";

export class TopicResolver {
  private readonly byKey: Map<string, DashboardTopicConfig>;

  constructor(config: DashboardTopicConfig[]) {
    this.byKey = new Map(config.map((item) => [item.key, item]));
  }

  get(key: string): DashboardTopicConfig | undefined {
    return this.byKey.get(key);
  }

  getByGroup(group: DashboardTopicConfig["group"]): DashboardTopicConfig[] {
    return [...this.byKey.values()].filter((item) => item.group === group);
  }

  getKeys(): string[] {
    return [...this.byKey.keys()];
  }
}
