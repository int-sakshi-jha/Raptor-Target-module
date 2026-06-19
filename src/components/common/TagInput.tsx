import { useState, type KeyboardEvent } from "react";
import Button from "./Button";
import Input from "./Input";

type TagInputProps<T = string> = {
  value: T[];
  onChange: (next: T[]) => void;
  label?: string;
  placeholder?: string;
  addButtonLabel?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  parseInput?: (raw: string) => T | null;
  formatTag?: (tag: T) => string;
  getTagKey?: (tag: T, index: number) => string;
  isDuplicate?: (existing: T, next: T) => boolean;
};

const chipClassName =
  "px-2 py-1 text-xs font-medium rounded-xs bg-brand-50 dark:bg-brand-600/10 text-brand-800 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-600/20 transition-colors";

const TagInput = <T,>({
  value,
  onChange,
  label = "Tags",
  placeholder = "Type a tag and press Enter",
  addButtonLabel = "Add Tag",
  emptyMessage = "No tags added yet.",
  disabled = false,
  className = "",
  parseInput,
  formatTag,
  getTagKey,
  isDuplicate,
}: TagInputProps<T>) => {
  const [inputValue, setInputValue] = useState("");

  const parseTag = (raw: string): T | null => {
    if (parseInput) return parseInput(raw);
    const nextTag = raw.trim();
    return (nextTag ? (nextTag as T) : null);
  };

  const formatValue = (tag: T): string => {
    if (formatTag) return formatTag(tag);
    return String(tag);
  };

  const addTag = () => {
    const nextTag = parseTag(inputValue);
    if (!nextTag) {
      setInputValue("");
      return;
    }

    const hasDuplicate = value.some((item) =>
      isDuplicate ? isDuplicate(item, nextTag) : item === nextTag,
    );
    if (hasDuplicate) {
      setInputValue("");
      return;
    }

    onChange([...value, nextTag]);
    setInputValue("");
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addTag();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="form-label">{label}</label>
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          divClassName="flex-1"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          onClick={addTag}
          disabled={disabled}
        >
          {addButtonLabel}
        </Button>
      </div>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <button
              key={getTagKey ? getTagKey(tag, index) : `${formatValue(tag)}-${index}`}
              type="button"
              onClick={() => removeTag(index)}
              className={chipClassName}
              disabled={disabled}
              title={formatValue(tag)}
            >
              {formatValue(tag)} x
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-neutral-500 dark:text-neutral-dark-500">
          {emptyMessage}
        </p>
      )}
    </div>
  );
};

export default TagInput;
