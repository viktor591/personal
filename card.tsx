import * as React from "react";

export function Card({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={"rounded-xl border border-gray-200 " + className} {...props}>{children}</div>;
}
export function CardHeader({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={"p-4 border-b border-gray-200 " + className} {...props}>{children}</div>;
}
export function CardTitle({ className = "", children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={"text-lg font-semibold " + className} {...props}>{children}</h2>;
}
export function CardContent({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={"p-4 " + className} {...props}>{children}</div>;
}
