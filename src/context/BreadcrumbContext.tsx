import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import type { BreadcrumbItem } from "@/components/common/Breadcrumb";
import type { BreadcrumbExtension } from "@/utils/breadcrumbBuilder";

type BreadcrumbContextValue = {
  extension: BreadcrumbExtension;
  setExtension: React.Dispatch<React.SetStateAction<BreadcrumbExtension>>;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [extension, setExtension] = useState<BreadcrumbExtension>({});

  const value = useMemo(
    () => ({ extension, setExtension }),
    [extension],
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

export function useBreadcrumbExtension(): BreadcrumbContextValue {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error("useBreadcrumbExtension must be used within BreadcrumbProvider");
  }
  return ctx;
}

/** Detail pages: parent list comes from the route; pass entity name and optional tab. */
export function useDetailBreadcrumb(
  detailLabel?: string | null,
  segmentLabel?: string | null,
): void {
  const { setExtension } = useBreadcrumbExtension();

  useLayoutEffect(() => {
    if (!detailLabel) {
      setExtension({});
      return;
    }

    setExtension({
      detailLabel,
      segmentLabel: segmentLabel ?? null,
      override: null,
    });

    return () => setExtension({});
  }, [detailLabel, segmentLabel, setExtension]);
}

/** Layouts with custom trails (plant tabs, user profile tabs). */
export function useBreadcrumbTrail(items: BreadcrumbItem[] | null): void {
  const { setExtension } = useBreadcrumbExtension();

  useLayoutEffect(() => {
    if (!items?.length) {
      setExtension({});
      return;
    }

    setExtension({ override: items, detailLabel: null, segmentLabel: null });
    return () => setExtension({});
  }, [items, setExtension]);
}

/** Imperative override (rare); prefer useBreadcrumbTrail or useDetailBreadcrumb. */
export function useSetBreadcrumbTrail(): (
  items: BreadcrumbItem[] | null,
) => void {
  const { setExtension } = useBreadcrumbExtension();

  return useCallback(
    (items: BreadcrumbItem[] | null) => {
      if (!items?.length) {
        setExtension({});
        return;
      }
      setExtension({ override: items, detailLabel: null, segmentLabel: null });
    },
    [setExtension],
  );
}
