import * as React from "react";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & { variant?: "secondary" | "outline" | "destructive" };
export function Badge({ className = "", variant, ...props }: BadgeProps) {
  const variants: Record<string,string> = {
    default: "bg-black text-white",
    secondary: "bg-gray-100 text-gray-800",
    outline: "border border-gray-300 text-gray-800",
    destructive: "bg-red-600 text-white"
  };
  const v = variant ? variants[variant] : variants.default;
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${v} ${className}`} {...props} />;
}
