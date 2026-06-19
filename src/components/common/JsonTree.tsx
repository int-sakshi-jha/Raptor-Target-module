import React from "react";

/**
 * Renders arbitrary JSON as nested key/value blocks (not a single stringified blob).
 */
export function JsonTree({
  data,
  depth = 0,
}: {
  data: unknown;
  depth?: number;
}): React.ReactNode {
  if (data === null || data === undefined) {
    return (
      <span className="text-neutral-400 italic dark:text-neutral-500">null</span>
    );
  }

  if (typeof data === "string") {
    return (
      <span className="break-words font-mono text-[13px] text-neutral-900 dark:text-neutral-dark-950">
        &quot;{data}&quot;
      </span>
    );
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return (
      <span className="font-mono text-[13px] tabular-nums text-emerald-800 dark:text-emerald-300">
        {String(data)}
      </span>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="font-mono text-[13px] text-neutral-500">[]</span>;
    }
    return (
      <ul
        className={`space-y-2 ${depth > 0 ? "mt-1 border-l border-neutral-200 pl-3 dark:border-neutral-700" : ""}`}
      >
        {data.map((item, i) => (
          <li key={i} className="min-w-0">
            <span className="mr-2 font-mono text-[11px] text-neutral-400">[{i}]</span>
            <JsonTree data={item} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) {
      return <span className="font-mono text-[13px] text-neutral-500">{"{}"}</span>;
    }
    return (
      <dl
        className={`space-y-2 ${depth > 0 ? "mt-1 border-l border-neutral-200 pl-3 dark:border-neutral-700" : ""}`}
      >
        {entries.map(([key, val]) => (
          <div key={key} className="min-w-0">
            <dt className="font-mono text-[12px] font-semibold text-brand-700 dark:text-brand-400">
              {key}
            </dt>
            <dd className="mt-0.5 pl-0">
              <JsonTree data={val} depth={depth + 1} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return <span className="text-neutral-600">{String(data)}</span>;
}
