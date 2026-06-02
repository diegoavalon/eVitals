import { Accordion } from "@base-ui/react/accordion";
import { type ReactNode } from "react";
import { cn } from "../../utils/cn";

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function TriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn(
        "size-6 shrink-0 transition-transform duration-200 ease-out-2",
        className,
      )}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M10 7l6 5-6 5V7z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type EhiAccordionItem = {
  /** Unique identifier for the item. Used by `value` / `defaultValue`. */
  value: string;
  /** Title text rendered in the trigger. */
  title: ReactNode;
  /** Expandable content. */
  content: ReactNode;
  /** Whether this individual item is disabled. */
  disabled?: boolean;
};

export type EhiAccordionProps = {
  /** Accordion items to render. */
  items: EhiAccordionItem[];
  /** Controlled open item(s). */
  value?: string[];
  /** Uncontrolled default open item(s). */
  defaultValue?: string[];
  /** Callback when the open items change. */
  onValueChange?: (value: string[]) => void;
  /** Allow multiple panels open simultaneously. */
  multiple?: boolean;
  /** Disable all items. */
  disabled?: boolean;
  /** Additional class names on the root container. */
  className?: string;
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const itemStyles = [
  "rounded-lg shadow-elevation-raised overflow-hidden",
  "bg-white",
  "transition-colors duration-150 ease-out-2",
  // hover
  "hover:bg-interactive-focus",
  // focus-within (keyboard nav on the trigger)
  "focus-within:bg-interactive-selected focus-within:ring-2 focus-within:ring-interactive-primary",
  // disabled
  "data-[disabled]:opacity-40 data-[disabled]:pointer-events-none",
].join(" ");

const triggerStyles = [
  "flex w-full cursor-pointer items-center gap-6 p-6",
  "font-poppins text-lg font-bold leading-7 text-black",
  "outline-none",
  // focus-visible ring is on the item via focus-within
].join(" ");

const panelStyles = [
  "overflow-hidden",
  "h-(--accordion-panel-height)",
  "transition-[height] duration-200 ease-out-2",
  "data-starting-style:h-0",
  "data-ending-style:h-0",
].join(" ");

const panelContentStyles = [
  "px-6 pb-6",
  "font-poppins text-lg font-normal leading-7 text-black",
].join(" ");

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * EhiAccordion — branded collapsible accordion built on Base UI `Accordion`.
 *
 * @example
 * ```tsx
 * <EhiAccordion
 *   items={[
 *     { value: "q1", title: "Is eHealth an insurance company?", content: "No, eHealth is …" },
 *     { value: "q2", title: "How do I enroll?", content: "You can enroll …" },
 *   ]}
 * />
 * ```
 */
export function EhiAccordion({
  items,
  value,
  defaultValue,
  onValueChange,
  multiple = false,
  disabled = false,
  className,
}: EhiAccordionProps) {
  return (
    <Accordion.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      multiple={multiple}
      disabled={disabled}
      className={cn("flex w-full flex-col gap-4", className)}
    >
      {items.map((item) => (
        <Accordion.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          className={itemStyles}
        >
          <Accordion.Header>
            <Accordion.Trigger className={triggerStyles}>
              <span className="flex-1 text-left">{item.title}</span>
              <TriangleIcon className="data-panel-open:rotate-90" />
            </Accordion.Trigger>
          </Accordion.Header>

          <Accordion.Panel className={panelStyles}>
            <div className={panelContentStyles}>{item.content}</div>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
