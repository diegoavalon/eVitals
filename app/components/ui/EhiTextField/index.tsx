import { Field } from "@base-ui/react/field";
import { cn } from "../../utils/cn";

type EhiTextFieldProps = Omit<
  React.ComponentPropsWithoutRef<typeof Field.Control>,
  "className"
> & {
  /** Visible label above the input. Omit to render without a label. */
  label?: string;
  /** Error message shown below the input. Setting this marks the field as invalid. */
  error?: string;
  /** Additional description text below the input (hidden when `error` is set). */
  description?: string;
  /** Additional class names applied to the root wrapper. */
  className?: string;
};

/* ------------------------------------------------------------------ */
/*  Style tokens (mapped from Figma → semantic Tailwind tokens)       */
/* ------------------------------------------------------------------ */

const rootStyles = "flex w-full flex-col items-start gap-1";

const labelStyles = [
  "font-poppins text-sm font-normal leading-5 tracking-[0.07px]",
  "text-black",
  "data-[disabled]:opacity-38",
].join(" ");

const inputStyles = [
  // base / enabled
  "h-12 w-full rounded px-3 py-2",
  "border border-enabled bg-white",
  "font-poppins text-base font-normal leading-6 text-black",
  "placeholder:text-black/40",
  "transition-colors duration-150 ease-out-2",
  // hover
  "data-[hover]:bg-interactive-focus data-[hover]:border-interactive-primary",
  // focus
  "data-[focused]:bg-interactive-selected data-[focused]:border-2 data-[focused]:border-interactive-primary",
  "data-[focused]:outline-none",
  // error / invalid
  "data-[invalid]:bg-interactive-error data-[invalid]:border-error data-[invalid]:text-error",
  "data-[invalid]:placeholder:text-error",
  // disabled
  "data-[disabled]:opacity-38 data-[disabled]:cursor-not-allowed",
].join(" ");

const errorStyles = [
  "flex items-start gap-2",
  "font-poppins text-sm font-normal leading-5 text-error",
].join(" ");

const descriptionStyles = [
  "font-poppins text-sm font-normal leading-5 text-dim",
].join(" ");

/* ------------------------------------------------------------------ */
/*  Error icon (inline SVG matching the Figma asset)                  */
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
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * EhiTextField – branded text input with label, error, and description support.
 * Built on Base UI's `Field` compound component.
 *
 * @example
 * ```tsx
 * <EhiTextField label="Email" placeholder="Enter your email" />
 * <EhiTextField label="Name" error="This field is required" />
 * <EhiTextField placeholder="No label" />
 * ```
 */
export function EhiTextField({
  label,
  error,
  description,
  className,
  ...inputProps
}: EhiTextFieldProps) {
  return (
    <Field.Root
      className={cn(rootStyles, className)}
      invalid={Boolean(error)}
      disabled={inputProps.disabled}
    >
      {label && <Field.Label className={labelStyles}>{label}</Field.Label>}

      <Field.Control className={inputStyles} {...inputProps} />

      {error && (
        <Field.Error className={errorStyles} match>
          <ErrorIcon />
          <span>{error}</span>
        </Field.Error>
      )}

      {description && !error && (
        <Field.Description className={descriptionStyles}>
          {description}
        </Field.Description>
      )}
    </Field.Root>
  );
}
