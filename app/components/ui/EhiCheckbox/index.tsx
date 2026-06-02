import { Checkbox } from "@base-ui/react/checkbox";
import { Field } from "@base-ui/react/field";
import { cn } from "../../utils/cn";

type EhiCheckboxProps = Omit<
  React.ComponentPropsWithoutRef<typeof Checkbox.Root>,
  "className"
> & {
  /** Visible label beside the checkbox. */
  label?: string;
  /** Error message shown below the checkbox. Setting this marks the field as invalid. */
  error?: string;
  /** Additional class names applied to the root wrapper. */
  className?: string;
};

/* ------------------------------------------------------------------ */
/*  Checkmark SVG                                                      */
/* ------------------------------------------------------------------ */

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.2 8.57l3.27 3.18L12.8 4.25"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Error icon (inline SVG matching ecosystem)                        */
/* ------------------------------------------------------------------ */

function ErrorIcon() {
  return (
    <svg
      className="size-5 shrink-0 text-error"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Style tokens (mapped from Figma → semantic Tailwind tokens)       */
/* ------------------------------------------------------------------ */

const checkboxStyles = [
  // base / enabled
  "flex items-center justify-center",
  "size-6 shrink-0 rounded",
  "border border-interactive-primary bg-white",
  "transition-colors duration-150 ease-out-2",
  "cursor-pointer select-none",
  // hover
  "hover:bg-interactive-focus",
  // focus
  "focus-visible:bg-interactive-selected focus-visible:border-2 focus-visible:border-interactive-primary",
  "focus-visible:outline-2 focus-visible:outline-warning focus-visible:outline-offset-2",
  // invalid / error (set by Field when invalid={true})
  "data-[invalid]:bg-interactive-error data-[invalid]:border-error",
  "data-[invalid]:hover:bg-interactive-error",
  // disabled
  "data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed",
].join(" ");

const indicatorStyles = [
  "flex items-center justify-center",
  "text-interactive-primary",
  "data-[invalid]:text-error",
  "data-[disabled]:text-interactive-primary",
].join(" ");

const labelStyles = [
  "font-poppins text-sm font-normal leading-5 tracking-[0.07px]",
  "text-black cursor-pointer select-none",
  "data-[disabled]:opacity-38",
].join(" ");

const errorStyles = [
  "flex items-start gap-2",
  "font-poppins text-sm font-normal leading-5 text-error",
].join(" ");

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * EhiCheckbox – branded checkbox built on Base UI's `Checkbox` + `Field`.
 *
 * @example
 * ```tsx
 * <EhiCheckbox label="Accept terms and conditions" />
 * <EhiCheckbox label="Newsletter" defaultChecked />
 * <EhiCheckbox label="Required" error="This field is required" />
 * <EhiCheckbox label="Disabled" disabled />
 * ```
 */
export function EhiCheckbox({
  label,
  error,
  className,
  ...checkboxProps
}: EhiCheckboxProps) {
  return (
    <Field.Root
      className={cn("flex flex-col gap-1", className)}
      invalid={Boolean(error)}
      disabled={checkboxProps.disabled}
    >
      <Field.Label className={cn(labelStyles, "flex items-center gap-2")}>
        <Checkbox.Root className={checkboxStyles} {...checkboxProps}>
          <Checkbox.Indicator className={indicatorStyles}>
            <CheckIcon />
          </Checkbox.Indicator>
        </Checkbox.Root>
        {label && <span>{label}</span>}
      </Field.Label>

      {error && (
        <Field.Error className={errorStyles} match>
          <ErrorIcon />
          <span>{error}</span>
        </Field.Error>
      )}
    </Field.Root>
  );
}
