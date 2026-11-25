"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useState, type ReactNode } from "react";
import {
  collectSelectFieldOptions,
  resolveSelectFieldLabel,
} from "./select-field-helpers";

export function SelectField({
  name,
  id,
  defaultValue = "",
  children,
  className = "mt-1 h-10 w-full bg-white",
  disabled = false,
  placeholder = "Pilih...",
  onValueChange,
}: {
  name?: string;
  id?: string;
  defaultValue?: string | number;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(String(defaultValue ?? ""));

  const options = collectSelectFieldOptions(children);
  const matchedOption = options.find((option) => option.value === value);
  const selectedLabel = resolveSelectFieldLabel(options, value, placeholder);
  const isPlaceholder = !matchedOption || !matchedOption.label;

  return (
    <>
      {name ? (
        <input type="hidden" name={name} value={value} disabled={disabled} />
      ) : null}
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(nextValue) => {
          const next = nextValue ?? "";
          setValue(next);
          onValueChange?.(next);
        }}
      >
        <SelectTrigger id={id} className={className}>
          <SelectValue placeholder={placeholder}>
            <span className={isPlaceholder ? "text-muted-foreground" : undefined}>
              {selectedLabel}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
