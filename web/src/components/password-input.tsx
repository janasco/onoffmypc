"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { authFieldClass, authFieldClassLight } from "@/components/auth-shell";

type PasswordInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  tone?: "dark" | "light";
};

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete = "current-password",
  required = true,
  tone = "dark",
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const fieldClass = tone === "light" ? authFieldClassLight : authFieldClass;

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={`${fieldClass} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className={`absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 ${
          tone === "light" ? "text-[#5C675E] hover:text-[#121612]" : "text-zinc-400 hover:text-zinc-100"
        }`}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
