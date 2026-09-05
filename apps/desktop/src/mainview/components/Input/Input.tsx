import type { InputHTMLAttributes, ReactNode } from "react";

import "./Input.css";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "children"> & {
  label?: ReactNode;
  hint?: ReactNode;
};

export function Input({ label, hint, className = "", ...props }: InputProps) {
  return (
    <label className="rastry-input">
      {label ? <span className="rastry-input__label">{label}</span> : null}
      <input className={`rastry-input__control ${className}`.trim()} {...props} />
      {hint ? <small className="rastry-input__hint">{hint}</small> : null}
    </label>
  );
}
