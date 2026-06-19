import type { DashboardDocument } from "../types/document";
import { DashboardGrid } from "./DashboardGrid";

interface DashboardCanvasProps {
  document: DashboardDocument;
  plantId?: string;
}

/** Read-only runtime view of a saved dashboard document. */
export function DashboardCanvas({ document, plantId }: DashboardCanvasProps) {
  return (
    <div className="min-h-0 w-full">
      <DashboardGrid document={document} plantId={plantId} />
    </div>
  );
}
