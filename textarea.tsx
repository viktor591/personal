import * as React from "react";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className = "", ...props }, ref
) {
  return <textarea ref={ref} className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm ${className}`} {...props} />;
});
