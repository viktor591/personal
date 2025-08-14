import * as React from "react";

type SelectContextType = {
  value?: string;
  onValueChange?: (v: string) => void;
  items: { value: string; label: React.ReactNode }[];
  registerItem: (item: { value: string; label: React.ReactNode }) => void;
};

const SelectContext = React.createContext<SelectContextType | null>(null);

type SelectProps = { value?: string; onValueChange?: (v: string) => void; children?: React.ReactNode };
export function Select({ value, onValueChange, children }: SelectProps) {
  const [items, setItems] = React.useState<{ value: string; label: React.ReactNode }[]>([]);
  const registerItem = React.useCallback((item) => {
    setItems((prev) => {
      if (prev.find((i) => i.value === item.value)) return prev;
      return [...prev, item];
    });
  }, []);
  return (
    <SelectContext.Provider value={{ value, onValueChange, items, registerItem }}>
      <div>{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className = "", children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className}>{children}</div>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span>{placeholder}</span>;
}

export function SelectContent({ children }: { children?: React.ReactNode }) {
  // Render the actual native select here to keep things simple
  const ctx = React.useContext(SelectContext)!;
  return (
    <select
      value={ctx.value ?? ""}
      onChange={(e) => ctx.onValueChange?.(e.target.value)}
      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
    >
      <option value="" disabled hidden></option>
      {ctx.items.map((it) => (
        <option key={it.value} value={it.value}>{it.label as any}</option>
      ))}
    </select>
  );
}

type ItemProps = { value: string; children: React.ReactNode };
export function SelectItem({ value, children }: ItemProps) {
  const ctx = React.useContext(SelectContext)!;
  React.useEffect(() => {
    ctx.registerItem({ value, label: children });
  }, [value, children]);
  // Do not render anything here; options are rendered in SelectContent
  return null;
}
