import type { HTMLAttributes } from "react";

import "./Card.css";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`rastry-card ${className}`.trim()} {...props} />;
}
