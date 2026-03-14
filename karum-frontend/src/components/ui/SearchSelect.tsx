import { useState, useRef, useEffect, useMemo, useCallback } from "react";

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

const ITEM_HEIGHT = 32;
const LIST_HEIGHT = 200;
const OVERSCAN = 5;
const MAX_VISIBLE = 200; // cap filtered results to keep things snappy

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
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return items.slice(0, MAX_VISIBLE);
    const q = search.toLowerCase();
    const results: SearchSelectItem[] = [];
    for (const item of items) {
      if (
        item.label.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q)
      ) {
        results.push(item);
        if (results.length >= MAX_VISIBLE) break;
      }
    }
    return results;
  }, [items, search]);

  // Build a lookup map for selected label — avoids O(n) find on 24k items
  const selectedLabel = useMemo(() => {
    if (!value) return null;
    for (const item of items) {
      if (item.value === value) return item.label;
    }
    return null;
  }, [items, value]);

  useEffect(() => {
    setHighlightIndex(0);
    setScrollTop(0);
    if (listRef.current) listRef.current.scrollTop = 0;
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

  // Scroll highlight into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const itemTop = highlightIndex * ITEM_HEIGHT;
    const itemBottom = itemTop + ITEM_HEIGHT;
    const container = listRef.current;

    if (itemTop < container.scrollTop) {
      container.scrollTop = itemTop;
    } else if (itemBottom > container.scrollTop + LIST_HEIGHT) {
      container.scrollTop = itemBottom - LIST_HEIGHT;
    }
  }, [highlightIndex, open]);

  const handleScroll = useCallback(() => {
    if (listRef.current) {
      setScrollTop(listRef.current.scrollTop);
    }
  }, []);

  // Virtual window calculations
  const totalHeight = filtered.length * ITEM_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    filtered.length,
    Math.ceil((scrollTop + LIST_HEIGHT) / ITEM_HEIGHT) + OVERSCAN,
  );

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

      {/* Dropdown list — virtualized */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-elevated border-2 border-amber">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-xs text-text-dim text-center">
              No results
            </div>
          ) : (
            <div
              ref={listRef}
              onScroll={handleScroll}
              style={{ height: Math.min(LIST_HEIGHT, totalHeight) }}
              className="overflow-y-auto"
            >
              <div style={{ height: totalHeight, position: "relative" }}>
                {filtered.slice(startIndex, endIndex).map((item, i) => {
                  const actualIndex = startIndex + i;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleSelect(item)}
                      style={{
                        position: "absolute",
                        top: actualIndex * ITEM_HEIGHT,
                        height: ITEM_HEIGHT,
                        left: 0,
                        right: 0,
                      }}
                      className={`w-full text-left px-3 text-xs cursor-pointer flex items-center justify-between ${
                        actualIndex === highlightIndex ? "bg-card-hover text-text" : "text-text-mid hover:bg-card"
                      } ${item.value === value ? "text-amber" : ""}`}
                    >
                      <span>{item.label}</span>
                      {item.value === value && (
                        <span className="text-amber text-[10px]">●</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {filtered.length >= MAX_VISIBLE && search.length < 2 && (
            <div className="px-3 py-1.5 text-[9px] text-text-dim border-t border-border text-center">
              Type to narrow {items.length.toLocaleString()} results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
