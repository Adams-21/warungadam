import { Children, Fragment, isValidElement, type ReactNode } from "react";

export type SelectFieldOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function reactNodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((child) => reactNodeToText(child)).join("");
  }
  if (isValidElement(node)) {
    return reactNodeToText(
      (node.props as { children?: ReactNode }).children,
    );
  }
  return "";
}

function flattenOptionChildren(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) => {
    if (isValidElement(child) && child.type === Fragment) {
      return flattenOptionChildren(
        (child.props as { children?: ReactNode }).children,
      );
    }
    return [child];
  });
}

export function collectSelectFieldOptions(children: ReactNode): SelectFieldOption[] {
  return flattenOptionChildren(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    const props = child.props as {
      value?: string | number;
      children?: ReactNode;
      disabled?: boolean;
    };
    const value = String(props.value ?? "");
    const label = reactNodeToText(props.children).trim();
    return [{ value, label, disabled: props.disabled }];
  });
}

export function resolveSelectFieldLabel(
  options: readonly SelectFieldOption[],
  value: string,
  placeholder: string,
): string {
  const match = options.find((option) => option.value === value);
  if (match) return match.label || placeholder;
  return placeholder;
}
