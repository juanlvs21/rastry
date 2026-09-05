import type { ButtonHTMLAttributes } from "react";

import "./Button.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button className={`rastry-button rastry-button--${variant} ${className}`.trim()} {...props} />
  );
}
