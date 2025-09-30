import React, { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const norm = (s) => (s || "").toLowerCase().trim();

export default function VirtualizedSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Type to filter…",
  required = false,
  disabled = false,
  height = 240,
  itemSize = 36,
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value || "");
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => setInput(value || ""), [value]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = norm(input);
    if (!q) return options;
    // strict prefix filter for 1st→2nd→3rd… letters
    return options.filter((opt) => norm(opt).startsWith(q));
  }, [input, options]);

  // --- Virtualizer (TanStack) ---
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => itemSize,
    overscan: 6,
  });

  // keep highlighted item in view when moving with keys
  useEffect(() => {
    if (!open || filtered.length === 0) return;
    rowVirtualizer.scrollToIndex(highlight, { align: "auto" });
  }, [highlight, open, filtered.length, rowVirtualizer]);

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          type="text"
          value={input}
          disabled={disabled}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
              setOpen(true);
              return;
            }
            if (!open) return;

            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const choice = filtered[highlight] ?? filtered[0];
              if (choice) {
                onChange(choice);
                setInput(choice);
                setOpen(false);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {open && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border bg-white shadow">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">No matches</div>
            ) : (
              <div
                ref={listRef}
                style={{ height, overflow: "auto", position: "relative" }}
              >
                <div
                  style={{
                    height: rowVirtualizer.getTotalSize(),
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const idx = virtualRow.index;
                    const opt = filtered[idx];
                    const isActive = idx === highlight;
                    return (
                      <div
                        key={virtualRow.key}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onChange(opt);
                          setInput(opt);
                          setOpen(false);
                        }}
                        onMouseEnter={() => setHighlight(idx)}
                        className={`px-3 py-2 cursor-pointer ${
                          isActive ? "bg-indigo-50" : ""
                        }`}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: virtualRow.size,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {opt}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
