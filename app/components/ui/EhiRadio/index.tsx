import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Field } from "@base-ui/react/field";
import { Fieldset } from "@base-ui/react/fieldset";
import { cn } from "../../utils/cn";

/* ------------------------------------------------------------------ */
/*  EhiRadioGroup                                                      */
/* ------------------------------------------------------------------ */

type EhiRadioGroupProps = Omit<
  React.ComponentPropsWithoutRef<typeof RadioGroup>,
  "className"
> & {
  /** Visible legend / group label. */
  legend?: string;
  /** Error message shown below the group. Marks the field as invalid. */
  error?: string;
  /** Additional class names applied to the Field.Root wrapper. */
  className?: string;
};

const legendStyles = [
  "font-poppins text-sm font-semibold leading-5 tracking-[0.07px]",
  "text-black pb-1",
].join(" ");

const errorStyles = [
  "flex items-start gap-2",
  "font-poppins text-sm font-normal leading-5 text-error",
].join(" ");

/**
 * EhiRadioGroup – wraps Base UI's `RadioGroup` in a `Field` + `Fieldset`
 * for accessible labeling, validation, and error display.
 *
 * @example
 * ```tsx
 * <EhiRadioGroup legend="Plan" name="plan" defaultValue="basic">
 *   <EhiRadioItem value="basic" label="Basic" />
 *   <EhiRadioItem value="pro"   label="Pro" />
 * </EhiRadioGroup>
 * ```
 */
export function EhiRadioGroup({
  legend,
  error,
  className,
  children,
  ...groupProps
}: EhiRadioGroupProps) {
  return (
    <Field.Root
      className={cn("flex flex-col gap-1", className)}
      invalid={Boolean(error)}
    >
      <Fieldset.Root render={<RadioGroup {...groupProps} />}>
        {legend && (
          <Fieldset.Legend className={legendStyles}>{legend}</Fieldset.Legend>
        )}
        <div className="flex flex-col gap-2">{children}</div>
      </Fieldset.Root>

      {error && (
        <Field.Error className={errorStyles} match>
          <ErrorIcon />
          <span>{error}</span>
        </Field.Error>
      )}
    </Field.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  EhiRadioItem                                                       */
/* ------------------------------------------------------------------ */

type EhiRadioItemProps = Omit<
  React.ComponentPropsWithoutRef<typeof Radio.Root>,
  "className"
> & {
  /** Visible label beside the radio. */
  label?: string;
  /** Additional class names applied to the Radio.Root element. */
  className?: string;
};

const radioStyles = [
  // base / enabled
  "flex items-center justify-center",
  "size-6 shrink-0 rounded-full",
  "border border-interactive-primary bg-white",
  "transition-colors duration-150 ease-out-2",
  "cursor-pointer select-none",
  // hover
  "hover:bg-interactive-focus",
  // focus-visible
  "focus-visible:bg-interactive-selected focus-visible:border-2 focus-visible:border-interactive-primary",
  "focus-visible:outline-2 focus-visible:outline-warning focus-visible:outline-offset-2",
  // invalid / error (set by Field when invalid={true})
  "data-[invalid]:bg-interactive-error data-[invalid]:border-error",
  "data-[invalid]:hover:bg-interactive-error",
  // disabled
  "data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed",
].join(" ");

const indicatorStyles = [
  "size-3 rounded-full",
  "bg-interactive-primary",
  "data-[invalid]:bg-error",
  "data-[disabled]:bg-interactive-primary",
].join(" ");

const labelStyles = [
  "flex items-center gap-2",
  "font-poppins text-sm font-normal leading-5 tracking-[0.07px]",
  "text-black cursor-pointer select-none",
  "data-[disabled]:opacity-38",
].join(" ");

/**
 * EhiRadioItem – a single radio button within an `EhiRadioGroup`.
 *
 * @example
 * ```tsx
 * <EhiRadioItem value="basic" label="Basic" />
 * ```
 */
export function EhiRadioItem({
  label,
  className,
  ...radioProps
}: EhiRadioItemProps) {
  return (
    <Field.Item>
      <Field.Label className={labelStyles}>
        <Radio.Root className={cn(radioStyles, className)} {...radioProps}>
          <Radio.Indicator className={indicatorStyles} />
        </Radio.Root>
        {label && <span>{label}</span>}
      </Field.Label>
    </Field.Item>
  );
}

/* ------------------------------------------------------------------ */
/*  Error icon (shared with other components)                         */
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
