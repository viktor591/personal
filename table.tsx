import * as React from "react";

export function Table({ className = "", ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={`w-full text-sm ${className}`} {...props} />;
}
export function TableHeader(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}
export function TableBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}
export function TableRow(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} />;
}
export function TableHead({ className = "", ...props }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  return <th className={`text-left font-medium px-3 py-2 border-b ${className}`} {...props} />;
}
export function TableCell({ className = "", ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-3 py-2 border-b ${className}`} {...props} />;
}
export function TableCaption({ className = "", ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={`text-xs text-gray-600 my-2 ${className}`} {...props} />;
}
