import type { ReactNode, SelectHTMLAttributes } from "react";

import "./Select.css";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  hint?: ReactNode;
};

export function Select({ label, hint, className = "", children, ...props }: SelectProps) {
  return (
    <label className="rastry-select">
      {label ? <span className="rastry-select__label">{label}</span> : null}
      <select className={`rastry-select__control ${className}`.trim()} {...props}>
        {children}
      </select>
      {hint ? <small className="rastry-select__hint">{hint}</small> : null}
    </label>
  );
}
