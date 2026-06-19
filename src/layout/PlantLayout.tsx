import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useMediaQuery } from "usehooks-ts";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Blocks,
  Boxes,
  GripVertical,
  History,
  LayoutDashboard,
  LineChart,
  ListTree,
  Menu,
  Radio,
  RotateCcw,
  X,
  Spline,
  Package
} from "lucide-react";
import AsyncSelect, { type Option } from "@/components/common/AsyncSelect";
import {
  fetchPlantNames,
  useGetPlantDetailsQuery,
  type PlantOption
} from "@/services/operations/plantAPI";
import { useOutletContext } from "react-router-dom";
import { type BreadcrumbItem } from "@/components/common/Breadcrumb";

const TAB_ITEMS: {
  key: string;
  path?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
    {
      key: "dashboard",
      path: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      key: "details",
      path: "details",
      label: "Details",
      icon: ListTree,
    },
    {
      key: "components",
      path: "components",
      label: "Components",
      icon: Boxes,
    },
    {
      key: "sld",
      label: "SLD",
      icon: Spline,
    },
    {
      key: "equipment-dashboard",
      path: "equipment-dashboard",
      label: "Equipment Dashboard",
      icon: Activity,
    },
    {
      key: "block-dashboard",
      label: "Block Dashboard",
      icon: Blocks,
    },
    {
      key: "inverter-dashboard",
      label: "Inverter Dashboard",
      icon: LineChart,
    },
    {
      key: "history",
      path: "history",
      label: "History",
      icon: History,
    },
    {
      key: "tracker",
      path: "tracker",
      label: "Tracker",
      icon: Radio,
    },
    {
      key: "alarms",
      path: "alarms",
      label: "Alarms",
      icon: AlertTriangle,
    },
    {
      key: "analysis",
      label: "Analysis",
      icon: LineChart,
    },
    {
      key: "assets",
      path: "assets",
      label: "Assets",
      icon: Package,
    },
  ];

function getPlantLabel(p: PlantOption): string {
  return (
    p.plant_name?.trim() ||
    p.display_name?.trim() ||
    p.name?.trim() ||
    String(p.id)
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function usePersistentDockPosition(storageKey: string) {
  const [pos, setPosInternal] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown };
      const x = typeof parsed.x === "number" ? parsed.x : null;
      const y = typeof parsed.y === "number" ? parsed.y : null;
      if (x === null || y === null) return null;
      return { x, y };
    } catch {
      return null;
    }
  });

  const persist = (next: { x: number; y: number }) => {
    setPosInternal(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  return { pos, setPos: persist };
}

function PlantFloatingDock({
  basePath,
  onBack,
  currentPlantId,
  currentPlantName,
  onSwitchPlant,
  isLargeScreen,
}: {
  basePath: string;
  onBack: () => void;
  currentPlantId: string;
  currentPlantName?: string;
  onSwitchPlant: (plantId: string) => void;
  isLargeScreen: boolean;
}) {
  const dockRef = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const { pos, setPos } = usePersistentDockPosition(
    "plantDockPos",
  );
  const [isDragging, setIsDragging] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedPlantValue, setSelectedPlantValue] = useState<Option | null>(
    null,
  );

  const [plantOptions, setPlantOptions] = useState<PlantOption[]>([]);
  const currentPlantLabel = useMemo(() => {
    const found = plantOptions.find((p) => String(p.id) === currentPlantId);
    if (found) return getPlantLabel(found);
    if (currentPlantName?.trim()) return currentPlantName.trim();
    return "Select plant";
  }, [plantOptions, currentPlantId, currentPlantName]);

  useEffect(() => {
    setSelectedPlantValue({
      value: currentPlantId,
      label: currentPlantLabel,
    });
  }, [currentPlantId, currentPlantLabel]);

  const loadPlantOptions = async (search = ""): Promise<Option[]> => {
    const options = await fetchPlantNames(search, 1, 25);
    setPlantOptions(
      options.map((o) => ({
        id: o.value,
        plant_name: o.label,
      })),
    );
    return options;
  };

  const getSelectedPlantId = (
    value: Option | Option[] | null | undefined,
  ): string | null => {
    if (!value) return null;
    if (Array.isArray(value)) {
      const first = value[0];
      return first?.value ? String(first.value) : null;
    }
    return value.value ? String(value.value) : null;
  };

  const getSelectedPlantLabel = (
    value: Option | Option[] | null | undefined,
  ): string | null => {
    if (!value) return null;
    if (Array.isArray(value)) {
      const first = value[0];
      return first?.label ?? null;
    }
    return value.label ?? null;
  };

  useEffect(() => {
    // default dock position: bottom-center, but computed after mount
    if (pos) return;
    const el = dockRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 12;
    const x = clamp(window.innerWidth / 2 - rect.width / 2, margin, window.innerWidth - rect.width - margin);
    const y = clamp(window.innerHeight - rect.height - margin, margin, window.innerHeight - rect.height - margin);
    setPos({ x, y });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dockRef, pos]);

  useEffect(() => {
    const recenterIntoViewport = () => {
      const el = dockRef.current;
      if (!el || !pos) return;
      const rect = el.getBoundingClientRect();
      const margin = 12;
      const nextX = clamp(pos.x, margin, window.innerWidth - rect.width - margin);
      const nextY = clamp(pos.y, margin, window.innerHeight - rect.height - margin);
      if (nextX !== pos.x || nextY !== pos.y) {
        setPos({ x: nextX, y: nextY });
      }
    };

    window.addEventListener("resize", recenterIntoViewport);
    window.addEventListener("orientationchange", recenterIntoViewport);
    return () => {
      window.removeEventListener("resize", recenterIntoViewport);
      window.removeEventListener("orientationchange", recenterIntoViewport);
    };
  }, [pos, setPos]);

  const dockStyle = pos
    ? ({
      left: `${pos.x}px`,
      top: `${pos.y}px`,
    } as const)
    : undefined;

  const beginDrag = (e: React.PointerEvent) => {
    if (!isLargeScreen) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const el = dockRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    setIsDragging(true);
    try {
      (dragHandleRef.current ?? el).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: PointerEvent) => {
      const st = dragStateRef.current;
      const el = dockRef.current;
      if (!st || !el || st.pointerId !== e.pointerId) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const margin = 12;
      const nextX = clamp(
        e.clientX - st.offsetX,
        margin,
        window.innerWidth - rect.width - margin,
      );
      const nextY = clamp(
        e.clientY - st.offsetY,
        margin,
        window.innerHeight - rect.height - margin,
      );
      setPos({ x: nextX, y: nextY });
    };

    const endDrag = (e: PointerEvent) => {
      const st = dragStateRef.current;
      const el = dockRef.current;
      if (!st || !el || st.pointerId !== e.pointerId) return;
      dragStateRef.current = null;
      setIsDragging(false);
      try {
        (dragHandleRef.current ?? el).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [isDragging, setPos]);

  const resetDockPosition = () => {
    const el = dockRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 12;
    const x = clamp(
      window.innerWidth / 2 - rect.width / 2,
      margin,
      window.innerWidth - rect.width - margin,
    );
    const y = clamp(
      window.innerHeight - rect.height - margin,
      margin,
      window.innerHeight - rect.height - margin,
    );
    setPos({ x, y });
  };

  const glassTheme = {
    controlBackground: "var(--glass-control-bg)",
    controlShadow: "var(--glass-control-shadow)",
    controlBorder: "var(--glass-control-border)",
    controlHoverBorder: "var(--glass-control-hover-border)",
    menuBackground: "var(--glass-menu-bg)",
    menuBorder: "var(--glass-menu-border)",
    menuShadow: "var(--glass-menu-shadow)",

  };

  const glassSelectStyles = {
    menuPortal: (base: object) => ({
      ...base,
      zIndex: 9999,
    }),

    container: (base: object) => ({
      ...base,
      minWidth: "120px",
      width: "100%",
    }),

    control: (
      base: object,
      state: { isFocused: boolean },
    ) => ({
      ...base,
      borderRadius: "6px",
      background: glassTheme.controlBackground,
      "&:hover": {
        border: glassTheme.controlHoverBorder,
      },
      backdropFilter: "blur(4px)",
      WebkitBackdropFilter: "blur(16px)",
      border: glassTheme.controlBorder,
      minHeight: "32px",
      height: "32px",
      fontSize: "0.7rem",
      color: "inherit",
      overflow: "hidden",
      transition: "all 0.2s ease",
      cursor: "text",
      ...(state.isFocused && {
        boxShadow: `
        inset 1px 1px 0 rgba(255,255,255,0.55),
        inset -1px -1px 0 rgba(255,255,255,0.12),
        0 0 0 2px rgba(255,255,255,0.08),
        0 8px 30px rgba(0,0,0,0.12)
      `,
      }),
    }),

    menu: (base: object) => ({
      ...base,
      background: glassTheme.menuBackground,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: glassTheme.menuBorder,
      borderRadius: "6px",
      overflow: "hidden",
    }),

    menuList: (base: object) => ({
      ...base,
      background: "transparent",
      padding: "2px 0",
    }),

    option: (
      base: object,
      state: { isSelected: boolean; isFocused: boolean },
    ) => ({
      ...base,
      fontSize: "0.7rem",
      padding: "5px 8px",
      cursor: "pointer",
      color: "inherit",
      backgroundColor: state.isSelected
        ? "rgba(249, 115, 22, 0.18)"
        : state.isFocused
          ? "rgba(249, 115, 22, 0.1)"
          : "transparent",
      "&:active": {
        backgroundColor: "rgba(249, 115, 22, 0.12)",
      },
    }),

    singleValue: (base: object) => ({
      ...base,
      color: "inherit",
      fontSize: "0.7rem",
    }),

    input: (base: object) => ({
      ...base,
      color: "inherit",
      fontSize: "0.7rem",
      margin: 0,
      padding: 0,
    }),

    placeholder: (base: object) => ({
      ...base,
      color: "rgba(100,100,100,0.7)",
      fontSize: "0.7rem",
    }),

    indicatorSeparator: () => ({
      display: "none",
    }),

    dropdownIndicator: () => ({
      display: "none",
    }),

    valueContainer: (base: object) => ({
      ...base,
      paddingLeft: "8px",
      paddingRight: "2px",
    }),
  };

  // const glassSelectComponents = {
  //   DropdownIndicator: () => null,
  //   IndicatorSeparator: () => null,
  // };


  if (!isLargeScreen) {
    return (
      <div className="fixed bottom-3 left-3 right-3 z-50 ">
        <button
          type="button"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setMobileOpen(false);
          }}
          className={`fixed inset-0 transition-opacity duration-300 ${mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
          aria-hidden={!mobileOpen}
          aria-label="Close mobile controls overlay"
        />

        {/* Left-slide control rail: back + plant selector */}
        <div
          className={`absolute bottom-0 left-0 right-12 transition-all duration-300 ease-out ${mobileOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-8 opacity-0"
            }`}
        >
          <div className="flex items-center gap-1.5 ">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onBack();
              }}
              className="glass-ui shadow-lg p-2.5 rounded-sm transition-colors text-neutral-600 dark:text-neutral-dark-600 hover:text-neutral-900 dark:hover:text-neutral-dark-950 h-10 w-14 flex justify-center items-center"
              aria-label="Back to plants"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1 mr-3.5">
              <AsyncSelect
                loadOptions={loadPlantOptions}
                apiSearch
                isClearable={false}
                placeholder="Select plant..."
                value={selectedPlantValue ?? { value: currentPlantId, label: currentPlantLabel }}
                onChange={(value) => {
                  const nextValue = value as Option | Option[] | null;
                  const selectedPlantId = getSelectedPlantId(nextValue);
                  if (!selectedPlantId) return;
                  const selectedPlantLabel =
                    getSelectedPlantLabel(nextValue) ?? currentPlantLabel;
                  setSelectedPlantValue({
                    value: selectedPlantId,
                    label: selectedPlantLabel,
                  });
                  onSwitchPlant(selectedPlantId);
                  setMobileOpen(false);
                }}
                menuPlacement="top"
                menuPosition="fixed"
                menuPortalTarget={document.body}
                styles={glassSelectStyles}
                // components={glassSelectComponents}
              // styles={{
              //   menuPortal: (base: object) => ({ ...base, zIndex: 9999 }),
              //   control: (base: object) => ({
              //     ...base,
              //     background: "rgba(255,255,255,0.18)",
              //     backdropFilter: "blur(14px)",
              //     WebkitBackdropFilter: "blur(14px)",
              //     border: "1px solid rgba(0,0,0,0.18)",
              //     boxShadow: "inset 0 2px 10px rgba(255,255,255,0.08)",
              //     minHeight: "34px",
              //     fontSize: "0.8rem",
              //   }),
              //   menu: (base: object) => ({
              //     ...base,
              //     background: "rgba(255,255,255,0.75)",
              //     backdropFilter: "blur(20px)",
              //     WebkitBackdropFilter: "blur(20px)",
              //     border: "1px solid rgba(0,0,0,0.12)",
              //   }),
              //   indicatorSeparator: () => ({ display: "none" }),
              // }}
              />
            </div>
          </div>
        </div>

        {/* Right-side upward animated tab items */}
        <div className={`glass-ui shadow-lg p-1 rounded-sm absolute bottom-12 right-0 flex max-h-[calc(100vh-7rem)] flex-col items-end gap-1 overflow-y-auto pb-1 [scrollbar-width:none] transition-all duration-300 ${mobileOpen ? "pointer-events-auto opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"}`}>
          {TAB_ITEMS.map((tab, idx) => (
            <NavLink
              key={tab.key}
              to={`${basePath}/${tab.path}`}
              onClick={() => setMobileOpen(false)}
              title={tab.label}
              aria-label={tab.label}
              className={({ isActive }) =>
                `group relative flex w-full max-w-12 min-w-0 shrink-0 flex-col items-center justify-center gap-0.5 !rounded-sm px-1 py-1.5 transition-colors ${isActive
                  ? "dark:selected-glass-ui selected-glass-ui !text-brand-600 dark:!text-white !ring-brand-500/30 dark:rounded-none"
                  : "text-neutral-500 hover:text-neutral-900 hover:bg-white/20 dark:text-neutral-dark-600 dark:hover:text-neutral-dark-950 dark:hover:bg-white/10"
                }`
              }
              style={{
                transform: mobileOpen ? "translateY(0px) scale(1)" : "translateY(8px) scale(0.96)",
                transitionDelay: mobileOpen ? `${idx * 28}ms` : "0ms",
              }}
            >
              <tab.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="block w-full min-w-0 max-w-full truncate text-center text-[9px] leading-tight font-medium">
                {tab.label}
              </span>
            </NavLink>
          ))}
        </div>

        {/* Main mobile FAB */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className={`glass-ui relative z-10 ml-auto h-10 w-14 flex p-1 items-center justify-center rounded-sm text-brand-600 dark:text-brand-400 shadow-lg transition-all duration-300 hover:scale-[1.03] ${mobileOpen ? "rotate-0" : "rotate-180"
            }`}
          aria-label={mobileOpen ? "Close plant controls" : "Open plant controls"}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>
    );
  }


  /* ── Large-screen glass select styles ───────────────────────── */


  return (
    <div
      ref={dockRef}
      style={dockStyle}
      className={`fixed z-[41] w-fit max-w-[min(92vw,calc(100vw-24px))] select-none ${isDragging ? "cursor-grabbing" : "cursor-default"
        }`}
    >
      <div className="glass-ui relative w-fit overflow-visible rounded-lg shadow-xl transition-colors">
        <div className="relative px-2">
          <div className="flex w-fit flex-nowrap items-center gap-2 p-1">

            {/* Back button */}
            <button
              type="button"
              onClick={onBack}
              className="group relative flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-sm px-1 py-1.5 text-neutral-500 transition-colors hover:bg-white/20 hover:text-neutral-900 dark:text-neutral-dark-700 dark:hover:bg-white/10 dark:hover:text-neutral-dark-950"
              aria-label="Back to plants"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="text-[9px] font-medium leading-tight">Back</span>
              <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 -translate-x-1/2 whitespace-nowrap rounded-sm glass-ui px-2.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-dark-950 opacity-0 shadow-lg transition-all duration-150 group-hover:opacity-100">
                Plants
              </span>
            </button>

            <div className="h-8 w-px shrink-0 bg-black/10 dark:bg-white/10" />

            {/* Plant selector */}
            <div className="relative w-44 shrink-0 !rounded-sm sm:w-52">
              <AsyncSelect
                loadOptions={loadPlantOptions}
                apiSearch
                isClearable={false}
                placeholder="Select plant..."
                value={selectedPlantValue ?? { value: currentPlantId, label: currentPlantLabel }}
                onChange={(value) => {
                  const nextValue = value as Option | Option[] | null;
                  const selectedPlantId = getSelectedPlantId(nextValue);
                  if (!selectedPlantId) return;
                  const selectedPlantLabel =
                    getSelectedPlantLabel(nextValue) ?? currentPlantLabel;
                  setSelectedPlantValue({
                    value: selectedPlantId,
                    label: selectedPlantLabel,
                  });
                  onSwitchPlant(selectedPlantId);
                }}
                menuPlacement="top"
                menuPosition="fixed"
                menuPortalTarget={document.body}
                styles={glassSelectStyles}
                // components={glassSelectComponents}
              />
            </div>

            <div className="h-8 w-px shrink-0 bg-black/10 dark:bg-white/10" />

            {/* Tab nav — shrink to content; scroll only if tabs exceed viewport */}
            <nav className="flex max-w-[min(58vw,640px)] shrink gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TAB_ITEMS.map((tab) => (
                <NavLink
                  key={tab.key}
                  to={`${basePath}/${tab.path}`}
                  title={tab.label}
                  aria-label={tab.label}
                  className={({ isActive }) =>
                    `group relative flex w-14  shrink-0 flex-col items-center justify-center gap-0.5 !rounded-sm px-1.5 py-1 transition-colors ${isActive
                      ? "dark:selected-glass-ui selected-glass-ui !text-brand-600 dark:!text-white !ring-brand-500/30 dark:rounded-none"
                      : "text-neutral-500 hover:text-neutral-900 hover:bg-white/20 dark:text-neutral-dark-600 dark:hover:text-neutral-dark-950 dark:hover:bg-white/10"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <tab.icon
                        className={`h-3.5 w-3.5 shrink-0 transition-colors ${isActive
                          ? "text-brand-600 dark:text-white"
                          : "text-neutral-500 group-hover:text-neutral-700 dark:text-neutral-dark-500 dark:group-hover:text-neutral-dark-800"
                          }`}
                      />
                      <span className="block w-full min-w-0 max-w-full truncate text-center text-[9px] font-medium leading-tight">
                        {tab.label}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="h-8 w-px shrink-0 bg-black/10 dark:bg-white/10" />

            {/* Reset + Drag */}
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={resetDockPosition}
                className="flex shrink-0 items-center justify-center rounded-sm p-1 text-neutral-500 transition-colors hover:bg-white/20 hover:text-neutral-900 dark:text-neutral-dark-600 dark:hover:bg-white/10 dark:hover:text-neutral-dark-950"
                aria-label="Reset dock position"
                title="Reset dock position"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <div
                onPointerDown={beginDrag}
                className="flex shrink-0 cursor-grab items-center justify-center rounded-sm p-1 text-neutral-500 transition-colors hover:bg-white/20 hover:text-neutral-900 dark:text-neutral-dark-600 dark:hover:bg-white/10 dark:hover:text-neutral-dark-950"
                role="button"
                aria-label="Drag dock"
                title="Drag dock"
                tabIndex={0}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

const PlantLayout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isLargeScreen = useMediaQuery("(min-width: 768px)");
  const { data: plantResponse } = useGetPlantDetailsQuery(id);
  const plant =
    plantResponse?.data?.data ?? plantResponse?.data ?? plantResponse?.plant;
  const currentPlantName: string | undefined =
    typeof plant?.plant_name === "string" ? plant.plant_name : undefined;

  const basePath = id ? `/plants/${id}` : "/plants";

const outletContext = useOutletContext<{ setBreadcrumbs?: React.Dispatch<React.SetStateAction<BreadcrumbItem[] | null>> } | null>();
const setBreadcrumbs = outletContext?.setBreadcrumbs ?? (() => {});

  useEffect(() => {
    // Determine the current tab based on pathname
    let matchedTab = TAB_ITEMS.find((tab) =>
      tab.path && location.pathname.endsWith(tab.path)
    );
    if (!matchedTab) {
      matchedTab = TAB_ITEMS.find((tab) =>
        tab.path && location.pathname.includes(tab.path)
      );
    }

    if (!id) {
      setBreadcrumbs([]);
      return;
    }

    const TabIcon = matchedTab?.icon;

    setBreadcrumbs([
      { label: "Plants", path: "/plants" },
      { label: currentPlantName || "..." },
      ...(matchedTab ? [{ label: matchedTab.label, path: matchedTab.path ? `${basePath}/${matchedTab.path}` : undefined, icon: TabIcon ? <TabIcon className="w-4 h-4" /> : undefined }] : [])
    ]);

    return () => setBreadcrumbs([]);
  }, [location.pathname, currentPlantName, id, setBreadcrumbs, basePath]);

  const handleBack = () => {
    navigate("/plants");
  };

  const handleSwitchPlant = (plantId: string) => {
    // keep user on the same sub-route when switching plants
    const currentPath = location.pathname;
    const parts = currentPath.split("/").filter(Boolean);
    const plantsIdx = parts.indexOf("plants");
    const subPath =
      plantsIdx >= 0 && parts.length > plantsIdx + 2
        ? `/${parts.slice(plantsIdx + 2).join("/")}`
        : "/dashboard";
    navigate(`/plants/${plantId}${subPath}`);
  };

  if (!id) {
    return null;
  }

  const layoutHeight = isLargeScreen
    ? "calc(100dvh - 42px)"
    : "calc(100dvh - 3.5rem)";

  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden"
    >
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden pb-20 md:pb-0">
        <Outlet context={{ setBreadcrumbs }} />
      </div>
      <PlantFloatingDock
        basePath={basePath}
        onBack={handleBack}
        currentPlantId={id}
        currentPlantName={currentPlantName}
        onSwitchPlant={handleSwitchPlant}
        isLargeScreen={isLargeScreen}
      />
    </div>
  );
};

export default PlantLayout;

 