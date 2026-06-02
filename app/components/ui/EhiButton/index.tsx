import { Button } from "@base-ui/react/button";
import { cn } from "../../utils/cn";

type EhiButtonVariant =
  | "primary"
  | "primary-alt"
  | "secondary"
  | "tertiary"
  | "quaternary"
  | "quinary"
  | "link"
  | "text-large";

type EhiButtonProps = Omit<React.ComponentPropsWithoutRef<typeof Button>, "className"> & {
  /** Visual style variant of the button. */
  variant?: EhiButtonVariant;
  className?: string;
};

const variantStyles: Record<EhiButtonVariant, string> = {
  primary: [
    // base
    "bg-interactive-action text-white text-[20px]",
    // hover
    "hover:bg-interactive-action-hover",
    // pressed / active
    "active:bg-interactive-action-hover",
    // disabled
    "data-[disabled]:bg-disabled data-[disabled]:text-white data-[disabled]:cursor-not-allowed",
  ].join(" "),
  "primary-alt": [
    // base
    "bg-surface-alert text-white text-[20px]",
    // hover
    "hover:brightness-90",
    // pressed / active
    "active:brightness-85",
    // disabled
    "data-[disabled]:bg-disabled data-[disabled]:text-white data-[disabled]:cursor-not-allowed",
  ].join(" "),
  secondary: [
    // base
    "bg-interactive-white text-interactive-primary border-2 border-interactive-primary text-[20px]",
    // hover
    "hover:bg-interactive-white-hover",
    // pressed / active
    "active:bg-interactive-white-hover",
    // disabled
    "data-[disabled]:border-disabled data-[disabled]:text-disabled data-[disabled]:cursor-not-allowed",
  ].join(" "),
  tertiary: [
    // base
    "bg-interactive-white text-interactive-neutral border-2 border-interactive-neutral text-[16px]",
    // hover
    "hover:bg-interactive-white-hover",
    // pressed / active
    "active:bg-interactive-white-hover",
    // disabled
    "data-[disabled]:border-disabled data-[disabled]:text-disabled data-[disabled]:cursor-not-allowed",
  ].join(" "),
  quaternary: [
    // base
    "bg-interactive-yellow text-interactive-neutral border-2 border-interactive-warning text-[20px]",
    // hover
    "hover:brightness-95",
    // pressed / active
    "active:brightness-90",
    // disabled
    "data-[disabled]:bg-disabled data-[disabled]:border-disabled data-[disabled]:text-white data-[disabled]:cursor-not-allowed",
  ].join(" "),
  quinary: [
    // base – compact secondary: smaller text, tighter padding, auto height
    "bg-interactive-white text-interactive-primary border-2 border-interactive-primary text-[16px] leading-[24px]",
    "px-4! h-auto!",
    // hover
    "hover:bg-interactive-white-hover",
    // pressed / active
    "active:bg-interactive-white-hover",
    // disabled
    "data-[disabled]:border-disabled data-[disabled]:text-disabled data-[disabled]:cursor-not-allowed",
  ].join(" "),
  link: [
    // base – text-only button, overrides base shape & padding
    "bg-transparent text-link font-medium text-[16px] leading-[24px] tracking-[0.08px]",
    "rounded! px-0! py-3! h-auto!",
    // hover
    "hover:text-link-visited hover:underline",
    // pressed / active
    "active:text-link-visited",
    // disabled
    "data-[disabled]:text-disabled data-[disabled]:cursor-not-allowed",
  ].join(" "),
  "text-large": [
    // base – large text-only button, keeps standard 48px height
    "bg-transparent text-link font-medium text-[20px]",
    "rounded! px-0!",
    // hover
    "hover:text-link-visited hover:underline",
    // pressed / active
    "active:text-link-visited",
    // disabled
    "data-[disabled]:text-disabled data-[disabled]:cursor-not-allowed",
  ].join(" "),
};

const baseStyles = [
  "inline-flex items-center justify-center",
  "h-12 px-6 py-2 gap-1.5",
  "rounded-full",
  "font-poppins font-bold leading-[28px] tracking-[0.02px]",
  "select-none cursor-pointer",
  "transition-colors duration-150 ease-out-2",
  "focus-visible:outline-2 focus-visible:outline-warning focus-visible:outline-offset-2",
].join(" ");

/**
 * EhiButton – branded button component built on Base UI.
 *
 * @example
 * ```tsx
 * <EhiButton>See Plans</EhiButton>
 * <EhiButton variant="primary-alt">See Plans</EhiButton>
 * <EhiButton variant="secondary">See Plans</EhiButton>
 * <EhiButton variant="tertiary">See Plans</EhiButton>
 * <EhiButton variant="quaternary">See Plans</EhiButton>
 * <EhiButton variant="quinary">See Plans</EhiButton>
 * <EhiButton variant="link">CTA Button</EhiButton>
 * <EhiButton variant="text-large">See Plans</EhiButton>
 * <EhiButton variant="primary" disabled>See Plans</EhiButton>
 * ```
 */
export function EhiButton({
  variant = "primary",
  className,
  children,
  ...props
}: EhiButtonProps) {
  return (
    <Button
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Button>
  );
}
