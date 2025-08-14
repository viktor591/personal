import * as React from "react";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = "", ...props }, ref
) {
  return <input ref={ref} className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm ${className}`} {...props} />;
});
