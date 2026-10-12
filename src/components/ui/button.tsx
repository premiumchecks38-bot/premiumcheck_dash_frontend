import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Spinner } from "@/components/ui/spinner";

export const buttonVariants = cva(
  "cursor-pointer focus-visible:outline-focus focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        control: "",
        primary:
          "hover:bg-neutral-800 bg-primary text-primary-foreground active:bg-primary",
        accent: "bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent",
        secondary: "bg-surface-alt text-text hover:bg-border active:bg-surface-alt",
        outline:
          "border-thin border-border bg-white text-text hover:border-border-strong hover:bg-surface-alt active:bg-surface-alt",
        ghost: "bg-transparent text-text hover:bg-surface-alt active:bg-surface",
        link: "min-h-touch rounded-none bg-transparent p-0 text-accent underline-offset-4 shadow-none hover:underline",
      },
      size: {
        none: "",
        compact: "px-2.5 py-1.5 text-caption sm:px-6 sm:py-3 sm:text-body",
        xs: "px-3 py-1 text-caption",
        sm: "px-4 py-2 text-small",
        md: "px-5 py-2.5 text-small sm:px-6 sm:py-3 sm:text-body",
        lg: "px-6 py-3 text-body sm:px-8 sm:py-3.5 sm:text-lead",
      },
    },
    compoundVariants: [
      {
        variant: ["primary", "accent", "secondary", "outline", "ghost"],
        className: "rounded-full",
      },
      {
        variant: ["primary", "accent", "secondary", "outline", "ghost", "link"],
        className:
          "group inline-flex min-h-touch items-center justify-center gap-2.5 font-heading font-semibold whitespace-nowrap transition-all duration-normal ease-standard select-none",
      },
      {
        size: "xs",
        className: "min-h-8 gap-1.5",
      },
      {
        size: "compact",
        className: "min-h-9 gap-1.5 sm:min-h-touch sm:gap-2.5",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonBadgeProps {
  className?: string;
  icon?: React.ReactNode;
  variant?: "light" | "dark" | "accent";
}

export function ButtonBadge({ className, icon, variant = "light" }: ButtonBadgeProps) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5 sm:h-5.5 sm:w-5.5",
        variant === "light" && "bg-white text-primary",
        variant === "dark" && "bg-primary text-white",
        variant === "accent" && "bg-accent text-white",
        className,
      )}
      aria-hidden="true"
    >
      {icon ?? <ArrowRight className="h-3 w-3" />}
    </span>
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  withArrow?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size,
      asChild = false,
      loading = false,
      withArrow = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const badgeVariant = variant === "accent" || variant === "primary" ? "light" : "dark";
    const classes = cn(buttonVariants({ variant, size, className }));
    const decoration = loading ? (
      <Spinner size="sm" className="shrink-0" />
    ) : withArrow ? (
      <ButtonBadge variant={badgeVariant} />
    ) : null;

    if (asChild) {
      return (
        <Slot.Root
          className={classes}
          ref={ref}
          aria-busy={loading ? "true" : undefined}
          {...props}
        >
          <Slot.Slottable>{children}</Slot.Slottable>
          {decoration}
        </Slot.Root>
      );
    }

    return (
      <button
        className={classes}
        ref={ref}
        disabled={disabled ? true : loading}
        aria-busy={loading ? "true" : undefined}
        {...props}
      >
        {loading ? <Spinner size="sm" className="shrink-0" /> : null}
        {children}
        {withArrow && !loading ? <ButtonBadge variant={badgeVariant} /> : null}
      </button>
    );
  },
);

Button.displayName = "Button";
