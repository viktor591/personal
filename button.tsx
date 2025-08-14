import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "secondary" | "destructive" | "ghost" | "outline"; size?: "sm" | "md";};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = "", variant, size, ...props }, ref
) {
  const base = "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm border border-transparent";
  const variants: Record<string,string> = {
    default: "bg-black text-white",
    secondary: "bg-gray-100 text-gray-900",
    destructive: "bg-red-600 text-white",
    ghost: "bg-transparent text-gray-900",
    outline: "bg-transparent text-gray-900 border-gray-300"
  };
  const v = variant ? variants[variant] : variants.default;
  const sizes: Record<string,string> = { sm: "px-2 py-1 text-xs", md: "px-3 py-2 text-sm" };
  const s = size ? sizes[size] : "";
  return <button ref={ref} className={`${base} ${v} ${s} ${className}`} {...props} />;
});
