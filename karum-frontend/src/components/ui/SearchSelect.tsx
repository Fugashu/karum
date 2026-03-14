import { useState, useRef, useEffect, useMemo } from "react";

export interface SearchSelectItem {
  value: string;
  label: string;
}

interface SearchSelectProps {
  items: SearchSelectItem[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  label?: string;
}

export function SearchSelect({
  items,
  value,
  onChange,
  placeholder = "Select...",
  label,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q),
    );
  }, [items, search]);

  const selectedLabel = items.find((i) => i.value === value)?.label ?? null;

  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlightIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[highlightIndex]) {
          onChange(filtered[highlightIndex].value);
          setOpen(false);
          setSearch("");
        }
        break;
      case "Escape":
        setOpen(false);
        setSearch("");
        break;
    }
  }

  function handleSelect(item: SearchSelectItem) {
    onChange(item.value);
    setOpen(false);
    setSearch("");
  }

  function handleInputClick() {
    if (!open) {
      setOpen(true);
      setSearch("");
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="block text-[10px] text-text-dim tracking-wider uppercase mb-1.5">
          {label}
        </label>
      )}

      {/* Input that doubles as trigger and search */}
      <div
        className={`w-full flex items-center gap-2 bg-card border-2 px-3 py-2.5 transition-colors ${
          open ? "border-amber" : "border-border hover:border-border-hover"
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={open ? search : selectedLabel ?? ""}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onClick={handleInputClick}
          onFocus={handleInputClick}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          readOnly={!open && !!selectedLabel}
          className="flex-1 bg-transparent text-xs text-text placeholder:text-text-dim focus:outline-none cursor-pointer min-w-0"
        />
        <span className="flex items-center shrink-0">
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            className={`text-text-dim transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </span>
      </div>

      {/* Dropdown list */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-elevated border-2 border-amber">
          <div ref={listRef} className="max-h-[200px] overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-xs text-text-dim text-center">
                No results
              </div>
            )}
            {filtered.map((item, i) => (
              <button
                key={item.value}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-3 py-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                  i === highlightIndex ? "bg-card-hover text-text" : "text-text-mid hover:bg-card"
                } ${item.value === value ? "text-amber" : ""}`}
              >
                <span>{item.label}</span>
                {item.value === value && (
                  <span className="text-amber text-[10px]">●</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
