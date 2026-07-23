interface SortGroupBarProps {
  sortOptions: { value: string; label: string }[];
  sortBy: string;
  sortDir: "asc" | "desc";
  onSortChange: (sortBy: string, sortDir: "asc" | "desc") => void;
  groupOptions?: { value: string; label: string }[];
  groupBy?: string;
  onGroupChange?: (groupBy: string | undefined) => void;
}

export function SortGroupBar({ sortOptions, sortBy, sortDir, onSortChange, groupOptions, groupBy, onGroupChange }: SortGroupBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono font-extrabold uppercase">Sort:</span>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value, sortDir)}
          className="border-2 border-border bg-background px-2 py-1.5 font-mono text-[10px] uppercase"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onSortChange(sortBy, sortDir === "asc" ? "desc" : "asc")}
          className="px-2 py-1.5 border-2 border-border bg-background font-mono text-[10px] font-extrabold"
          title={sortDir === "asc" ? "Ascending" : "Descending"}
        >
          {sortDir === "asc" ? "↑ ASC" : "↓ DESC"}
        </button>
      </div>

      {/* Group */}
      {groupOptions && onGroupChange && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-extrabold uppercase">Group:</span>
          <select
            value={groupBy ?? ""}
            onChange={(e) => onGroupChange(e.target.value || undefined)}
            className="border-2 border-border bg-background px-2 py-1.5 font-mono text-[10px] uppercase"
          >
            <option value="">None</option>
            {groupOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
