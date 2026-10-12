import { Check, X } from "lucide-react";

import { PASSWORD_RULES } from "@/lib/auth/password-policy";
import { cn } from "@/lib/utils/cn";

/** Live checklist of the password rules, updated as the person types. */
export function PasswordPolicy({ value, id }: { value: string; id?: string }) {
  return (
    <ul id={id} className="mt-2 space-y-1 font-body text-caption" aria-live="polite">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        const Icon = met ? Check : X;
        return (
          <li
            key={rule.id}
            className={cn("flex items-center gap-2", met ? "text-success-text" : "text-text-muted")}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {rule.label}
              <span className="sr-only">{met ? " (done)" : " (not yet)"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
