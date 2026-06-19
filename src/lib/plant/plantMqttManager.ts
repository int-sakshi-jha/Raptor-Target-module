import mqtt, { type MqttClient } from "mqtt";
import { buildPlantLiveIndex, type PlantLiveIndex } from "@/lib/plant/plantLiveIndex";
import {
  buildPlantProcessedCache,
  type PlantProcessedByComponent,
} from "@/lib/plant/plantLiveProcessed";
import type { PlantMqttConnectionState } from "@/lib/plant/plantMqtt.types";
import type { PlantLiveData } from "@/types/plantLive";
import { normalizeComponentType } from "@/pages/plant/plant-components/shared";

export type { PlantMqttConnectionState };

type StoreListener = () => void;

interface MqttRuntimeConfig {
  wsUrl: string;
  topicPrefix: string;
  clientId: string;
  username: string;
  password: string;
}

export interface PlantMqttStoreSnapshot {
  connectionState: PlantMqttConnectionState;
  errorMessage: string | null;
  brokerUrl: string;
  topicPrefix: string;
  configWarning: string | null;
  activePlantId: string | null;
  plantSnapshots: ReadonlyMap<string, PlantLiveData>;
  liveIndexByPlant: ReadonlyMap<string, PlantLiveIndex>;
  processedByPlant: ReadonlyMap<string, PlantProcessedByComponent>;
  lastMessageAtByPlant: ReadonlyMap<string, Date>;
  subscribedPlantIds: ReadonlySet<string>;
}

/** Survives Vite HMR so we never orphan a reconnecting client with the same clientId. */
interface PlantMqttRuntimeStore {
  runtimeClient: MqttClient | null;
  runtimeConfig: MqttRuntimeConfig | null;
  connectionState: PlantMqttConnectionState;
  errorMessage: string | null;
  intentionalDisconnect: boolean;
  activePlantId: string | null;
  connectionNonce: string;
  listenersGeneration: number;
  attachedListenerGeneration: number;
  globalListeners: Set<StoreListener>;
  plantSnapshots: Map<string, PlantLiveData>;
  liveIndexByPlant: Map<string, PlantLiveIndex>;
  processedByPlant: Map<string, PlantProcessedByComponent>;
  lastMessageAtByPlant: Map<string, Date>;
  componentTypeByPlant: Map<string, Map<string, string>>;
  subscribedTopics: Set<string>;
  dashboardPlantIds: Set<string>;
  cachedGlobalSnapshot: PlantMqttStoreSnapshot | null;
  notifyFlushScheduled: boolean;
}

const RUNTIME_KEY = "__solarPlantMqttRuntime";

function createConnectionNonce(): string {
  return new Date().getTime().toString();
}

function getStore(): PlantMqttRuntimeStore {
  const root = globalThis as typeof globalThis & {
    [RUNTIME_KEY]?: PlantMqttRuntimeStore;
  };
  if (!root[RUNTIME_KEY]) {
    root[RUNTIME_KEY] = {
      runtimeClient: null,
      runtimeConfig: null,
      connectionState: "idle",
      errorMessage: null,
      intentionalDisconnect: false,
      activePlantId: null,
      connectionNonce: createConnectionNonce(),
      listenersGeneration: 0,
      attachedListenerGeneration: -1,
      globalListeners: new Set(),
      plantSnapshots: new Map(),
      liveIndexByPlant: new Map(),
      processedByPlant: new Map(),
      lastMessageAtByPlant: new Map(),
      componentTypeByPlant: new Map(),
      subscribedTopics: new Set(),
      dashboardPlantIds: new Set(),
      cachedGlobalSnapshot: null,
      notifyFlushScheduled: false,
    };
  }
  return root[RUNTIME_KEY];
}

function getTabSessionId(): string {
  const key = "plant-mqtt-tab-session";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID().slice(0, 12);
    sessionStorage.setItem(key, created);
    return created;
  } catch {
    return "session";
  }
}

function getMqttConfig(store: PlantMqttRuntimeStore): MqttRuntimeConfig {
  const wsUrl =
    import.meta.env.VITE_MQTT_WS_URL?.trim() || "ws://192.168.2.68:8083/mqtt";
  const topicPrefix =
    import.meta.env.VITE_MQTT_PLANT_TOPIC_PREFIX?.trim() || "plants/live";
  const baseClientId =
    import.meta.env.VITE_MQTT_CLIENT_ID?.trim() || "frontend-web-client";
  const username =
    import.meta.env.VITE_MQTT_USERNAME?.trim() || "frontend-web-client";
  const password =
    import.meta.env.VITE_MQTT_PASSWORD?.trim() || "frontend-secure-password-2024";

  return {
    wsUrl,
    topicPrefix,
    clientId: `${baseClientId}-${getTabSessionId()}-${store.connectionNonce}`,
    username,
    password,
  };
}

function getConfigWarning(): string | null {
  return !import.meta.env.VITE_MQTT_PASSWORD?.trim()
    ? "VITE_MQTT_PASSWORD is not set — MQTT authentication will fail until you add it (e.g. in .env.local)."
    : null;
}

function rebuildLiveIndex(store: PlantMqttRuntimeStore, plantId: string) {
  const plantLive = store.plantSnapshots.get(plantId);
  if (!plantLive) {
    store.liveIndexByPlant.delete(plantId);
    store.processedByPlant.delete(plantId);
    return;
  }
  const typeMap = store.componentTypeByPlant.get(plantId);
  const index = buildPlantLiveIndex(plantLive, typeMap);
  if (index) {
    store.liveIndexByPlant.set(plantId, index);
    store.processedByPlant.set(plantId, buildPlantProcessedCache(index));
  } else {
    store.liveIndexByPlant.delete(plantId);
    store.processedByPlant.delete(plantId);
  }
}

const SNAPSHOT_CACHE_PREFIX = "plant-mqtt-snapshot:";

function persistPlantSnapshot(plantId: string, plantLive: PlantLiveData) {
  try {
    sessionStorage.setItem(
      `${SNAPSHOT_CACHE_PREFIX}${plantId}`,
      JSON.stringify(plantLive),
    );
  } catch {
    // quota / private mode — ignore
  }
}

function restorePlantSnapshot(plantId: string): PlantLiveData | null {
  try {
    const raw = sessionStorage.getItem(`${SNAPSHOT_CACHE_PREFIX}${plantId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlantLiveData;
    if (parsed?.plant_id !== plantId) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Rebuild indexes + processed cache from any cached raw snapshot (refresh / reconnect). */
function rebuildCachedPlantData(store: PlantMqttRuntimeStore, plantId: string) {
  if (!store.plantSnapshots.has(plantId)) {
    const restored = restorePlantSnapshot(plantId);
    if (restored) store.plantSnapshots.set(plantId, restored);
  }
  if (store.plantSnapshots.has(plantId)) {
    rebuildLiveIndex(store, plantId);
  }
}

function rebuildActivePlantData(store: PlantMqttRuntimeStore) {
  if (!store.activePlantId) return;
  rebuildCachedPlantData(store, store.activePlantId);
}

function buildGlobalSnapshot(store: PlantMqttRuntimeStore): PlantMqttStoreSnapshot {
  const config = store.runtimeConfig ?? getMqttConfig(store);
  const subscribedPlantIds = new Set<string>();
  if (store.activePlantId) subscribedPlantIds.add(store.activePlantId);
  store.dashboardPlantIds.forEach((plantId) => subscribedPlantIds.add(plantId));

  return {
    connectionState: store.connectionState,
    errorMessage: store.errorMessage,
    brokerUrl: config.wsUrl,
    topicPrefix: config.topicPrefix,
    configWarning: getConfigWarning(),
    activePlantId: store.activePlantId,
    plantSnapshots: new Map(store.plantSnapshots),
    liveIndexByPlant: new Map(store.liveIndexByPlant),
    processedByPlant: new Map(store.processedByPlant),
    lastMessageAtByPlant: new Map(store.lastMessageAtByPlant),
    subscribedPlantIds,
  };
}

function refreshGlobalSnapshot(store: PlantMqttRuntimeStore) {
  store.cachedGlobalSnapshot = buildGlobalSnapshot(store);
}

function scheduleNotify(store: PlantMqttRuntimeStore) {
  if (store.notifyFlushScheduled) return;
  store.notifyFlushScheduled = true;
  queueMicrotask(() => {
    store.notifyFlushScheduled = false;
    refreshGlobalSnapshot(store);
    store.globalListeners.forEach((listener) => listener());
  });
}

function buildTopic(store: PlantMqttRuntimeStore, plantId: string): string {
  const prefix = store.runtimeConfig?.topicPrefix ?? getMqttConfig(store).topicPrefix;
  return `${prefix}/${plantId}`;
}

function parsePlantPayload(payload: Uint8Array): PlantLiveData | null {
  try {
    const text = new TextDecoder().decode(payload);
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.plant_id !== "string" || typeof record.devices !== "object") {
      return null;
    }
    return parsed as PlantLiveData;
  } catch {
    return null;
  }
}

function setConnectionState(
  store: PlantMqttRuntimeStore,
  next: PlantMqttConnectionState,
  error?: string | null,
) {
  if (store.connectionState === next && store.errorMessage === (error ?? null)) {
    return;
  }
  store.connectionState = next;
  store.errorMessage = error ?? null;
  scheduleNotify(store);
}

function isClientReconnecting(client: MqttClient | null): boolean {
  if (!client) return false;
  return Boolean((client as MqttClient & { reconnecting?: boolean }).reconnecting);
}

function retireClient(client: MqttClient) {
  client.removeAllListeners();
  client.options.reconnectPeriod = 0;
  try {
    client.end(true);
  } catch {
    // ignore — socket may already be closed
  }
}

function destroyClient(store: PlantMqttRuntimeStore) {
  const client = store.runtimeClient;
  if (!client) return;

  store.intentionalDisconnect = true;
  store.runtimeClient = null;
  retireClient(client);

  store.subscribedTopics.clear();
  store.connectionState = "idle";
  store.errorMessage = null;
  scheduleNotify(store);

  queueMicrotask(() => {
    store.intentionalDisconnect = false;
  });
}

function attachClientListeners(store: PlantMqttRuntimeStore, client: MqttClient) {
  client.removeAllListeners();

  client.on("connect", () => {
    setConnectionState(store, "connected");
    syncSubscriptions(store);
    rebuildActivePlantData(store);
    scheduleNotify(store);
  });

  client.on("reconnect", () => {
    setConnectionState(store, "reconnecting");
  });

  client.on("message", (_topic, payload) => {
    const bytes =
      payload instanceof Uint8Array ? payload : new Uint8Array(payload);
    const parsed = parsePlantPayload(bytes);
    if (!parsed) return;

    store.plantSnapshots.set(parsed.plant_id, parsed);
    store.lastMessageAtByPlant.set(parsed.plant_id, new Date());
    persistPlantSnapshot(parsed.plant_id, parsed);

    queueMicrotask(() => {
      rebuildLiveIndex(store, parsed.plant_id);
      scheduleNotify(store);
    });
  });

  client.on("error", (err) => {
    setConnectionState(store, "error", err.message);
  });

  client.on("close", () => {
    if (store.intentionalDisconnect) return;
    if (isClientReconnecting(client)) {
      setConnectionState(store, "reconnecting");
      return;
    }
    if (store.runtimeClient === client) {
      setConnectionState(store, "disconnected");
    }
  });

  client.on("offline", () => {
    if (store.intentionalDisconnect) return;
    if (isClientReconnecting(client)) {
      setConnectionState(store, "reconnecting");
      return;
    }
    if (store.runtimeClient === client) {
      setConnectionState(store, "disconnected");
    }
  });

  store.attachedListenerGeneration = store.listenersGeneration;
}

function ensureListeners(store: PlantMqttRuntimeStore) {
  const client = store.runtimeClient;
  if (!client) return;
  if (store.attachedListenerGeneration === store.listenersGeneration) return;
  attachClientListeners(store, client);
}

function subscribeTopic(store: PlantMqttRuntimeStore, client: MqttClient, topic: string) {
  if (store.subscribedTopics.has(topic)) return;
  client.subscribe(topic, { qos: 0 }, (err) => {
    if (err) {
      setConnectionState(store, "error", err.message);
      return;
    }
    store.subscribedTopics.add(topic);
    scheduleNotify(store);
  });
}

function unsubscribeTopic(store: PlantMqttRuntimeStore, client: MqttClient, topic: string) {
  if (!store.subscribedTopics.has(topic)) return;
  client.unsubscribe(topic, () => {
    store.subscribedTopics.delete(topic);
    scheduleNotify(store);
  });
}

function hasMqttSubscriptionTarget(store: PlantMqttRuntimeStore): boolean {
  return Boolean(store.activePlantId) || store.dashboardPlantIds.size > 0;
}

function syncSubscriptions(store: PlantMqttRuntimeStore) {
  const client = store.runtimeClient;
  if (!client?.connected) return;

  const desiredTopics = new Set<string>();
  if (store.activePlantId) {
    desiredTopics.add(buildTopic(store, store.activePlantId));
  }
  store.dashboardPlantIds.forEach((plantId) => {
    desiredTopics.add(buildTopic(store, plantId));
  });

  for (const topic of desiredTopics) {
    subscribeTopic(store, client, topic);
  }

  for (const topic of [...store.subscribedTopics]) {
    if (!desiredTopics.has(topic)) {
      unsubscribeTopic(store, client, topic);
    }
  }
}

function ensureClient(store: PlantMqttRuntimeStore): MqttClient {
  if (store.runtimeClient) {
    ensureListeners(store);
    return store.runtimeClient;
  }

  store.runtimeConfig = getMqttConfig(store);
  store.connectionState = "connecting";
  store.errorMessage = null;
  scheduleNotify(store);

  const client = mqtt.connect(store.runtimeConfig.wsUrl, {
    clientId: store.runtimeConfig.clientId,
    username: store.runtimeConfig.username,
    password: store.runtimeConfig.password,
    clean: true,
    reconnectPeriod: 5_000,
    connectTimeout: 15_000,
    keepalive: 30,
    protocolVersion: 4,
    resubscribe: true,
  });

  store.listenersGeneration += 1;
  store.runtimeClient = client;
  attachClientListeners(store, client);
  return client;
}

function connectIfNeeded(store: PlantMqttRuntimeStore) {
  if (!hasMqttSubscriptionTarget(store)) return;
  ensureClient(store);
}

function clientNeedsReconnect(store: PlantMqttRuntimeStore): boolean {
  if (!hasMqttSubscriptionTarget(store)) return false;
  if (!store.runtimeClient) return true;
  if (store.intentionalDisconnect) return false;
  return !store.runtimeClient.connected && !isClientReconnecting(store.runtimeClient);
}

function syncActivePlantMqtt(store: PlantMqttRuntimeStore): void {
  if (!hasMqttSubscriptionTarget(store)) {
    if (store.runtimeClient?.connected) {
      syncSubscriptions(store);
    }
    scheduleNotify(store);
    return;
  }

  connectIfNeeded(store);
  rebuildActivePlantData(store);
  store.dashboardPlantIds.forEach((plantId) => rebuildCachedPlantData(store, plantId));
  if (store.runtimeClient?.connected) {
    syncSubscriptions(store);
  }
  scheduleNotify(store);
}

function applyActivePlant(store: PlantMqttRuntimeStore, plantId: string | null) {
  const normalized = plantId?.trim() || null;
  const plantChanged = store.activePlantId !== normalized;
  store.activePlantId = normalized;

  const canSkip =
    !plantChanged &&
    normalized !== null &&
    store.runtimeClient?.connected &&
    !clientNeedsReconnect(store) &&
    store.processedByPlant.has(normalized);

  if (canSkip) return;

  syncActivePlantMqtt(store);
}

function initModule() {
  const store = getStore();

  if (store.runtimeClient) {
    ensureListeners(store);
  }

  if (store.activePlantId && clientNeedsReconnect(store)) {
    syncActivePlantMqtt(store);
  } else if (store.activePlantId) {
    rebuildActivePlantData(store);
    if (store.runtimeClient?.connected) {
      syncSubscriptions(store);
    }
  }

  refreshGlobalSnapshot(store);

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      const s = getStore();
      if (s.runtimeClient) {
        s.listenersGeneration += 1;
      }
    });
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return;
    destroyClient(getStore());
  });

  window.addEventListener("pageshow", (event) => {
    const store = getStore();
    if (!store.activePlantId) return;
    if (event.persisted || clientNeedsReconnect(store)) {
      syncActivePlantMqtt(store);
    }
  });

  initModule();
} else {
  getStore();
}

export function setActivePlantMqtt(plantId: string | null | undefined): void {
  if (typeof window === "undefined") return;
  applyActivePlant(getStore(), plantId?.trim() || null);
}

/** Subscribe to live MQTT topics for multiple plants (main dashboard). */
export function setDashboardPlantMqttIds(plantIds: readonly string[]): void {
  if (typeof window === "undefined") return;
  const store = getStore();
  const next = new Set(plantIds.map((id) => id.trim()).filter(Boolean));
  const changed =
    next.size !== store.dashboardPlantIds.size ||
    [...next].some((id) => !store.dashboardPlantIds.has(id));

  if (!changed) return;

  store.dashboardPlantIds = next;
  syncActivePlantMqtt(store);
}

export function setPlantMqttComponentTypes(
  plantId: string,
  componentTypeById: ReadonlyMap<string, string>,
): void {
  if (typeof window === "undefined" || !plantId) return;
  const store = getStore();

  const map = new Map<string, string>();
  componentTypeById.forEach((type, id) => {
    map.set(id, normalizeComponentType(type));
  });
  store.componentTypeByPlant.set(plantId, map);

  rebuildCachedPlantData(store, plantId);
  scheduleNotify(store);
}

export function subscribePlantMqttStore(listener: StoreListener): () => void {
  const store = getStore();
  store.globalListeners.add(listener);
  return () => {
    store.globalListeners.delete(listener);
  };
}

export function getPlantMqttStoreSnapshot(): PlantMqttStoreSnapshot {
  const store = getStore();
  if (!store.cachedGlobalSnapshot) {
    refreshGlobalSnapshot(store);
  }
  return store.cachedGlobalSnapshot!;
}

/** @deprecated Use {@link setActivePlantMqtt} from PlantLayout instead. */
export function acquirePlantMqttPlant(plantId: string): () => void {
  setActivePlantMqtt(plantId);
  return () => undefined;
}

export function primePlantMqttFromCache(plantId: string): PlantLiveData | null {
  return getStore().plantSnapshots.get(plantId) ?? null;
}

export function getPlantMqttTopic(plantId: string, topicPrefix: string): string {
  return `${topicPrefix}/${plantId}`;
}
