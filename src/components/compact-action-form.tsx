"use client";

import {
  ActionMessage,
  Button,
  secondaryButtonClass,
} from "@/components/ui";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { useActionState, type ReactNode } from "react";

type CompactActionFormProps = {
  action: (formData: FormData) => Promise<ActionState>;
  submitLabel: ReactNode;
  children?: ReactNode;
  className?: string;
  buttonClassName?: string;
  pendingLabel?: string;
};

export function CompactActionForm({
  action,
  submitLabel,
  children,
  className,
  buttonClassName = secondaryButtonClass,
  pendingLabel = "Memproses...",
}: CompactActionFormProps) {
  const [state, formAction, pending] = useActionState(
    (_prevState: ActionState, formData: FormData) => action(formData),
    EMPTY_ACTION_STATE,
  );

  return (
    <div className="space-y-1">
      <form action={formAction} className={className}>
        {children}
        <Button type="submit" className={buttonClassName} disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </form>
      <ActionMessage state={state} />
    </div>
  );
}
