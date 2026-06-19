import type { PlantRow } from "@/services/operations/plantAPI";
import type { PlantLiveData } from "@/types/plantLive";
import { calculateRevenue, resolveRevenueTypeFromPlant } from "../calculations/calculateRevenue";
import { calculateYield } from "../calculations/calculateYield";
import type {
  DashboardTopicConfig,
  KpiAggregateMetrics,
  PlantDashboardMetrics,
  PlantOperationalStatus,
} from "../types/dashboard.types";
import { FieldResolver } from "./FieldResolver";
import { MetricResolver } from "./MetricResolver";
import { TopicResolver } from "./TopicResolver";

function sumNullable(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, value) => acc + (typeof value === "number" && Number.isFinite(value) ? value : 0), 0);
}

function countByStatus(plants: PlantDashboardMetrics[]): KpiAggregateMetrics["plantStatus"] {
  const counts = { online: 0, offline: 0, unknown: 0, total: plants.length };
  for (const plant of plants) {
    if (plant.status === "active") counts.online += 1;
    else if (plant.status === "inactive") counts.offline += 1;
    else counts.unknown += 1;
  }
  return counts;
}

export class DashboardDataTransformer {
  private readonly topics: TopicResolver;
  private readonly fields: FieldResolver;
  private readonly metrics: MetricResolver;

  constructor(topicConfig: DashboardTopicConfig[]) {
    this.topics = new TopicResolver(topicConfig);
    this.fields = new FieldResolver(this.topics);
    this.metrics = new MetricResolver(this.topics, this.fields);
  }

  transformPlant(
    plant: PlantRow,
    mqtt?: PlantLiveData | null,
  ): PlantDashboardMetrics {
    const sources = { plant, mqtt };
    const dcCapacityKw = plant.dc_capacity_kw ?? this.fields.resolveNumber("installed_capacity", sources);
    const todayGenerationKwh = this.fields.resolveNumber("today_generation", sources);
    const revenueType = resolveRevenueTypeFromPlant(
      this.fields.resolveString("revenue_type", sources) ?? plant.revenue_type,
    );

    const exportEnergyKwh = this.fields.resolveNumber("export_energy", sources);
    const importEnergyKwh = this.fields.resolveNumber("import_energy", sources);
    const ppaRate = plant.ppa_rate ?? this.fields.resolveNumber("ppa_rate", sources);

    const revenue = calculateRevenue({
      revenueType,
      exportEnergyKwh,
      importEnergyKwh,
      todayGenerationKwh,
      ppaRate,
    });

    let status = this.metrics.resolveStatus(sources);
    if (status === "unknown" && !mqtt) {
      status = normalizePlantStatusFromRow(plant);
    }

    return {
      plantId: plant.id,
      plantName: plant.plant_name ?? "Unnamed Plant",
      status,
      currentPowerKw: this.fields.resolveNumber("current_power", sources),
      exportPowerKw: this.fields.resolveNumber("export_power", sources),
      importPowerKw: this.fields.resolveNumber("import_power", sources),
      todayGenerationKwh,
      totalGenerationKwh: this.fields.resolveNumber("total_generation", sources),
      revenue,
      acCapacityKw: plant.ac_capacity_kw ?? null,
      dcCapacityKw,
      alertsCount: this.fields.resolveNumber("active_alerts", sources) ?? 0,
      inactiveComponentsCount: this.fields.resolveNumber("inactive_components", sources) ?? 0,
      yield: calculateYield(todayGenerationKwh, dcCapacityKw),
      performanceRatio: this.fields.resolveNumber("performance_ratio", sources),
      cuf: this.fields.resolveNumber("cuf", sources),
      latitude: plant.latitude ?? null,
      longitude: plant.longitude ?? null,
      lastUpdated: mqtt?.timestamp ?? plant.updated_at ?? null,
      revenueType,
      exportEnergyKwh,
      importEnergyKwh,
      ppaRate,
      hasLiveData: Boolean(mqtt),
    };
  }

  aggregateKpis(
    plants: PlantDashboardMetrics[],
    mqttByPlant: ReadonlyMap<string, PlantLiveData>,
    plantRows: PlantRow[],
  ): KpiAggregateMetrics {
    const currentPowerMw = sumNullable(plants.map((p) => p.currentPowerKw)) / 1000;
    const installedCapacityMw =
      sumNullable(plantRows.map((p) => p.dc_capacity_kw)) / 1000;

    const sumField = (key: string) =>
      sumNullable(
        plantRows.map((plant) =>
          this.fields.resolveNumber(key, {
            plant,
            mqtt: mqttByPlant.get(plant.id) ?? null,
          }),
        ),
      );

    const hasLive = mqttByPlant.size > 0;
    const latestTimestamp = [...mqttByPlant.values()]
      .map((item) => item.timestamp)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

    return {
      currentPowerMw,
      installedCapacityMw,
      earnings: {
        daily: { earnings: sumField("daily_earnings"), fullLoadHours: sumField("daily_full_load_hours") },
        weekly: { earnings: sumField("weekly_earnings"), fullLoadHours: sumField("weekly_full_load_hours") },
        monthly: { earnings: sumField("monthly_earnings"), fullLoadHours: sumField("monthly_full_load_hours") },
        yearly: { earnings: sumField("yearly_earnings"), fullLoadHours: sumField("yearly_full_load_hours") },
      },
      plantStatus: countByStatus(plants),
      alerts: {
        activeAlerts: sumNullable(plants.map((p) => p.alertsCount)),
        activeAlarms: sumField("active_alarms"),
      },
      lastUpdated: latestTimestamp,
      isLive: hasLive,
    };
  }

  getMetricResolver(): MetricResolver {
    return this.metrics;
  }
}

export function normalizePlantStatusFromRow(plant: PlantRow): PlantOperationalStatus {
  const comm = String(plant.communication_status ?? "").toLowerCase();
  if (comm.includes("online") || comm.includes("active")) return "active";
  if (comm.includes("offline") || comm.includes("inactive")) return "inactive";
  if (comm.includes("partial") || comm.includes("degraded")) return "partial";
  if (plant.is_active === true) return "active";
  if (plant.is_active === false) return "inactive";
  return "unknown";
}
