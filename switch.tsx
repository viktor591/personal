import * as React from "react";

type Props = { checked?: boolean; onCheckedChange?: (checked: boolean) => void };
export function Switch({ checked, onCheckedChange }: Props) {
  return (
    <label style={{display:'inline-flex', alignItems:'center', gap:8, cursor:'pointer'}}>
      <input type="checkbox" checked={!!checked} onChange={e => onCheckedChange?.(e.target.checked)} />
    </label>
  );
}
