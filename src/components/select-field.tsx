"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  Children,
  isValidElement,
  useState,
  type ReactNode,
} from "react";

type OptionProps = {
  value?: string | number;
  children?: ReactNode;
  disabled?: boolean;
};

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

  const options = Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    const props = child.props as OptionProps;
    const optionValue = String(props.value ?? "");
    return [
      <SelectItem key={optionValue} value={optionValue} disabled={props.disabled}>
        {props.children}
      </SelectItem>,
    ];
  });

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
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{options}</SelectContent>
      </Select>
    </>
  );
}
