import { Select } from "@base-ui/react/select";
import { Field } from "@base-ui/react/field";
import { cn } from "../../utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type EhiSelectItem = {
  /** The value stored and returned by the select. */
  value: string;
  /** Primary display label. Falls back to `value` when omitted. */
  label: string;
  /** Optional secondary/supporting text displayed below the label. */
  description?: string;
  /** Whether the item is disabled. */
  disabled?: boolean;
};

type EhiSelectVariant = "raised" | "outline";

type EhiSelectProps = {
  /** Visual style variant of the trigger. */
  variant?: EhiSelectVariant;
  /** Visible label above the trigger. */
  label?: string;
  /** Placeholder text shown when no value is selected. */
  placeholder?: string;
  /** Error message shown below the trigger. Marks the field as invalid. */
  error?: string;
  /** List of selectable options. */
  items: EhiSelectItem[];
  /** Controlled value. */
  value?: string;
  /** Uncontrolled default value. */
  defaultValue?: string;
  /** Callback fired when the value changes. */
  onValueChange?: (value: string | null) => void;
  /** Whether the select is disabled. */
  disabled?: boolean;
  /** Whether the select is required. */
  required?: boolean;
  /** Field name for form integration. */
  name?: string;
  /** Additional class names on the root wrapper. */
  className?: string;
};

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.8 12.86l4.9 4.76L19.2 6.38"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-5 text-interactive-primary", className)}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-11.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0ZM9.25 10a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0v-3Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Style tokens                                                       */
/* ------------------------------------------------------------------ */

const variantTriggerStyles: Record<EhiSelectVariant, string> = {
  raised: [
    "bg-white shadow-elevation-raised",
    // hover
    "hover:bg-interactive-focus hover:border-2 hover:border-interactive-primary hover:px-[11px] hover:py-[7px]",
    // focus
    "focus-visible:border-2 focus-visible:border-interactive-primary focus-visible:px-[11px] focus-visible:py-[7px]",
    "focus-visible:outline-2 focus-visible:outline-warning focus-visible:outline-offset-2",
    // invalid / error
    "data-[invalid]:bg-interactive-error data-[invalid]:border data-[invalid]:border-error",
    // disabled
    "data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed",
  ].join(" "),
  outline: [
    "bg-white border border-interactive-neutral",
    // hover
    "hover:bg-interactive-focus hover:border-2 hover:border-interactive-primary hover:px-[11px] hover:py-[7px]",
    // focus
    "focus-visible:border-2 focus-visible:border-interactive-primary focus-visible:px-[11px] focus-visible:py-[7px]",
    "focus-visible:outline-2 focus-visible:outline-warning focus-visible:outline-offset-2",
    // invalid / error
    "data-[invalid]:bg-interactive-error data-[invalid]:border data-[invalid]:border-error",
    // disabled
    "data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed",
  ].join(" "),
};

const baseTriggerStyles = [
  "flex w-full items-center gap-6",
  "h-12 rounded-lg px-3 py-2",
  "font-poppins text-base font-medium leading-6 text-black",
  "cursor-pointer select-none",
  "transition-colors duration-150 ease-out-2",
].join(" ");

const labelStyles = [
  "flex items-center gap-1",
  "font-poppins text-sm font-normal leading-5 tracking-[0.07px]",
  "text-black",
  "data-[disabled]:opacity-38",
].join(" ");

const popupStyles = [
  "overflow-hidden rounded",
  "border border-enabled",
  "shadow-elevation-overlay",
  "bg-white",
  "outline-none",
  // animations
  "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
  "transition-opacity duration-150 ease-out-2",
].join(" ");

const itemStyles = [
  "flex flex-col justify-center gap-1",
  "w-full px-4 py-3",
  "font-poppins text-base font-normal leading-6 text-black",
  "cursor-pointer select-none outline-none",
  "transition-colors duration-100 ease-out-2",
  // highlighted (keyboard/hover)
  "data-[highlighted]:bg-interactive-focus",
  // selected
  "data-[selected]:bg-interactive-selected",
].join(" ");

const errorStyles = [
  "flex items-start gap-2",
  "font-poppins text-sm font-normal leading-5 text-error",
].join(" ");

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * EhiSelect – branded select dropdown built on Base UI's `Select`.
 *
 * @example
 * ```tsx
 * <EhiSelect
 *   label="Country"
 *   placeholder="Choose a country"
 *   items={[
 *     { value: "us", label: "United States" },
 *     { value: "ca", label: "Canada" },
 *   ]}
 * />
 * ```
 */
export function EhiSelect({
  variant = "raised",
  label,
  placeholder = "Select an option",
  error,
  items,
  value,
  defaultValue,
  onValueChange,
  disabled,
  required,
  name,
  className,
}: EhiSelectProps) {
  return (
    <Field.Root
      className={cn("flex w-full flex-col gap-1", className)}
      invalid={Boolean(error)}
      disabled={disabled}
    >
      {label && (
        <Field.Label
          className={labelStyles}
          nativeLabel={false}
          render={<div />}
        >
          <span>{label}</span>
          <InfoIcon />
        </Field.Label>
      )}

      <Select.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        required={required}
        name={name}
      >
        <Select.Trigger
          className={cn(baseTriggerStyles, variantTriggerStyles[variant])}
        >
          <Select.Value
            className="flex-1 truncate text-left data-placeholder:text-black/40"
            placeholder={placeholder}
          />
          <Select.Icon className="shrink-0 text-black">
            <ChevronDownIcon />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Positioner
            className="z-50 w-(--anchor-width)"
            sideOffset={4}
            side="bottom"
            align="start"
          >
            <Select.Popup className={popupStyles}>
              <Select.List>
                {items.map((item) => (
                  <Select.Item
                    key={item.value}
                    value={item.value}
                    disabled={item.disabled}
                    className={itemStyles}
                  >
                    <div className="flex w-full items-center gap-3">
                      <Select.ItemText className="flex-1">
                        {item.label}
                      </Select.ItemText>
                      <Select.ItemIndicator className="shrink-0 text-interactive-primary">
                        <CheckIcon className="size-6" />
                      </Select.ItemIndicator>
                    </div>
                    {item.description && (
                      <span className="font-open-sans text-sm font-normal leading-5 text-black">
                        {item.description}
                      </span>
                    )}
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>

      {error && (
        <Field.Error className={errorStyles} match>
          <ErrorIcon />
          <span>{error}</span>
        </Field.Error>
      )}
    </Field.Root>
  );
}
