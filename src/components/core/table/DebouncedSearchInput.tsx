import React, { useEffect, useMemo, useRef, useState } from "react";
import { debounce } from "lodash";
import { Search } from "lucide-react";
import Input from "../../common/Input";

export interface DebouncedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** When positive, parent onChange runs after idle; typing uses local state. */
  debounceMs?: number;
  /** When debouncing, trim before calling onChange (default true). */
  trimOnCommit?: boolean;
  className?: string;
  inputClassName?: string;
  startIcon?: React.ReactNode;
  type?: React.HTMLInputTypeAttribute;
  min?: number;
  max?: number;
}

const DebouncedSearchInput: React.FC<DebouncedSearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
  trimOnCommit = true,
  className = "",
  inputClassName = "",
  startIcon = <Search className="w-4 h-4 z-[1]" />,
  type = "text",
  min,
  max,
}) => {
  const prevCommittedRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const trimOnCommitRef = useRef(trimOnCommit);

  const [local, setLocal] = useState(value);

  onChangeRef.current = onChange;
  trimOnCommitRef.current = trimOnCommit;

  useEffect(() => {
    if (value !== prevCommittedRef.current) {
      prevCommittedRef.current = value;
      setLocal(value);
    }
  }, [value]);

  // Keep one debounced function per debounceMs so parent re-renders (new inline onChange)
  // do not cancel pending emits via useEffect cleanup.
  const debouncedEmit = useMemo(() => {
    if (debounceMs <= 0) return null;
    return debounce((raw: string) => {
      const next = trimOnCommitRef.current ? raw.trim() : raw;
      onChangeRef.current(next);
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    return () => {
      debouncedEmit?.cancel();
    };
  }, [debouncedEmit]);

  if (debounceMs <= 0) {
    return (
      <div className={className}>
        <Input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
          startIcon={startIcon}
          min={min}
          max={max}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <Input
        type={type}
        placeholder={placeholder}
        value={local}
        onChange={(e) => {
          const raw = e.target.value;
          setLocal(raw);
          debouncedEmit?.(raw);
        }}
        className={inputClassName}
        startIcon={startIcon}
        min={min}
        max={max}
      />
    </div>
  );
};

export default DebouncedSearchInput;
