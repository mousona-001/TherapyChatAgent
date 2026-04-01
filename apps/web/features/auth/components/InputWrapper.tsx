"use client"
import { InputHTMLAttributes, useState } from "react";

import { Input, Label } from "@repo/ui";
import { Eye, EyeClosed } from "@phosphor-icons/react";

interface InputWrapperProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  icon?: React.ReactNode;
  isPassword?: boolean;
}

export function InputWrapper({ label, id, icon, isPassword, className, ...props }: InputWrapperProps) {
  const [showPassword, setShowPassword] = useState(false);
  const type = isPassword ? (showPassword ? "text" : "password") : props.type;

  return (
    <div className="flex flex-col gap-[0.45rem]">
      <Label
        htmlFor={id}
        className="text-[0.6rem] font-bold tracking-[0.12em] uppercase text-on-surface-variant ml-[0.15rem]"
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={type}
          className={`w-full py-[0.7rem] px-[0.85rem] font-sans text-[0.9rem] text-on-surface bg-surface-container-low border-none rounded-sm border-b-2 border-transparent outline-none transition-colors focus-visible:ring-0 focus:bg-surface-container-lowest focus-visible:border-b-primary focus-visible:shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] placeholder:text-on-surface-variant placeholder:opacity-55 h-auto ${
            icon || isPassword ? "pr-10" : ""
          } ${className || ""}`}
          {...props}
        />
        {(icon || isPassword) && (
          <div
            className={`absolute right-[0.85rem] top-1/2 -translate-y-1/2 text-on-surface-variant opacity-50 text-[1rem] flex items-center ${
              isPassword ? "cursor-pointer pointer-events-auto hover:opacity-80" : "pointer-events-none"
            }`}
            onClick={isPassword ? () => setShowPassword(!showPassword) : undefined}
          >
            {isPassword ? showPassword ? <EyeClosed weight="bold" /> : <Eye weight="bold" /> : icon}
          </div>
        )}
      </div>
    </div>
  );
}
