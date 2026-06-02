import { Dialog } from "@base-ui/react/dialog";
import { createContext, useContext, type ReactNode } from "react";
import { cn } from "../../utils/cn";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

type EhiModalSize = "large" | "small";
const ModalSizeContext = createContext<EhiModalSize>("large");

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type EhiModalProps = {
  /** Controlled open state. */
  open?: boolean;
  /** Uncontrolled default open state. */
  defaultOpen?: boolean;
  /** Callback when the open state changes. */
  onOpenChange?: (open: boolean) => void;
  /** Size of the modal panel. `"large"` = 840 px, `"small"` = 320 px max-width. */
  size?: EhiModalSize;
  /** Content rendered inside the modal panel (header, body, footer). */
  children: ReactNode;
  /** Additional class names on the modal panel. */
  className?: string;
};

export type EhiModalHeaderProps = {
  /** Title text. Renders inside `Dialog.Title` for accessibility. */
  title?: string;
  /** Show the close (X) button. @default true */
  showClose?: boolean;
  /** Back-navigation handler. Shows a back arrow when provided. */
  onBack?: () => void;
  /** Text label for the back button (e.g. `"Back"`). Shows a text link instead of an arrow icon. */
  backLabel?: string;
  /** Visual variant. `"highlight"` applies the green tool-header background. */
  variant?: "default" | "highlight";
  /** Logo or custom element displayed centred in the header. Takes priority over `title`. */
  logo?: ReactNode;
  /** Additional class names. */
  className?: string;
};

export type EhiModalBodyProps = {
  /** Scrollable body content. */
  children: ReactNode;
  /** Additional class names. */
  className?: string;
};

export type EhiModalFooterProps = {
  /** Footer content — typically `EhiButton` elements. */
  children: ReactNode;
  /** Additional class names. */
  className?: string;
};

/* ------------------------------------------------------------------ */
/*  EhiModal                                                           */
/* ------------------------------------------------------------------ */

/**
 * Branded modal dialog built on Base UI `Dialog`.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <button onClick={() => setOpen(true)}>Open</button>
 *
 * <EhiModal open={open} onOpenChange={setOpen}>
 *   <EhiModalHeader title="Confirmation" />
 *   <EhiModalBody>Are you sure?</EhiModalBody>
 *   <EhiModalFooter>
 *     <EhiButton variant="primary" onClick={() => setOpen(false)}>
 *       Yes
 *     </EhiButton>
 *   </EhiModalFooter>
 * </EhiModal>
 * ```
 */
export function EhiModal({
  open,
  defaultOpen,
  onOpenChange,
  size = "large",
  children,
  className,
}: EhiModalProps) {
  return (
    <Dialog.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      <Dialog.Portal>
        {/* Backdrop / blanket */}
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-blanket",
            "transition-opacity duration-300 ease-out-2",
            "data-starting-style:opacity-0 data-ending-style:opacity-0",
          )}
        />

        {/* Centering viewport */}
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          {/* Panel */}
          <Dialog.Popup
            className={cn(
              "relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-elevation-overlay outline-none",
              size === "large" ? "max-w-210" : "max-w-80",
              "transition-all duration-300 ease-out-2",
              "data-starting-style:translate-y-4 data-starting-style:opacity-0",
              "data-ending-style:translate-y-4 data-ending-style:opacity-0",
              className,
            )}
          >
            <ModalSizeContext.Provider value={size}>
              {children}
            </ModalSizeContext.Provider>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  EhiModalHeader                                                     */
/* ------------------------------------------------------------------ */

/**
 * Header bar for `EhiModal`.
 *
 * Supports several layout combinations matching the Figma anatomy:
 * - **close** — just the X button (default)
 * - **logo** — centred logo + close
 * - **back-arrow / back-text** — back navigation only
 * - **title-close** — title + close
 * - **back-close** — back + close
 * - **title-back-close** — back + centred title + close
 * - **highlight** — green tool-header background
 */
export function EhiModalHeader({
  title,
  showClose = true,
  onBack,
  backLabel,
  variant = "default",
  logo,
  className,
}: EhiModalHeaderProps) {
  const size = useContext(ModalSizeContext);
  const isHighlight = variant === "highlight";
  const hasBack = Boolean(onBack);

  /* ---------- derived styles ---------- */

  // Background: highlight → green; has back nav → grey; else → white
  const bgClass = isHighlight
    ? "bg-surface-highlight"
    : hasBack
      ? "bg-surface-100"
      : "bg-white";

  // Text & icon colour inherits from the container
  const colorClass = isHighlight ? "text-white" : "text-black";

  // Size-dependent tokens
  const paddingClass = size === "large" ? "p-4" : "px-4 py-3";
  const iconSizeClass = size === "large" ? "size-8" : "size-6";
  const titleSizeClass =
    size === "large"
      ? "text-2xl leading-8" // 24 px / 32 px
      : "text-lg leading-7"; // 18 px / 28 px

  return (
    <header
      className={cn(
        "flex shrink-0 items-center gap-4",
        bgClass,
        paddingClass,
        colorClass,
        className,
      )}
    >
      {/* ---- Back button ---- */}
      {onBack &&
        (backLabel ? (
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 items-center gap-0.5 rounded font-poppins text-base font-medium leading-6 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-warning"
          >
            <ChevronLeftIcon className="size-6" />
            <span>{backLabel}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded hover:opacity-70 focus-visible:outline-2 focus-visible:outline-warning"
            aria-label="Go back"
          >
            <BackArrowIcon className={iconSizeClass} />
          </button>
        ))}

      {/* ---- Logo (centred) ---- */}
      {logo && (
        <div className="flex flex-1 items-center justify-center">{logo}</div>
      )}

      {/* ---- Title ---- */}
      {title && !logo && (
        <Dialog.Title
          className={cn(
            "min-w-0 flex-1 truncate font-poppins font-bold",
            titleSizeClass,
            // Centre when flanked by both back & close
            hasBack && showClose ? "text-center" : "",
          )}
        >
          {title}
        </Dialog.Title>
      )}

      {/* ---- Spacer (pushes close to the right when no centre content) ---- */}
      {!title && !logo && <div className="flex-1" />}

      {/* ---- Close button ---- */}
      {showClose && (
        <Dialog.Close
          className="shrink-0 rounded-full hover:opacity-70 focus-visible:outline-2 focus-visible:outline-warning"
          aria-label="Close dialog"
        >
          <CloseIcon className={iconSizeClass} />
        </Dialog.Close>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  EhiModalBody                                                       */
/* ------------------------------------------------------------------ */

/** Scrollable content area for `EhiModal`. */
export function EhiModalBody({ children, className }: EhiModalBodyProps) {
  const size = useContext(ModalSizeContext);

  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto",
        size === "large" ? "px-6 py-4" : "px-4 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EhiModalFooter                                                     */
/* ------------------------------------------------------------------ */

/** Sticky footer for `EhiModal`, typically containing action buttons. */
export function EhiModalFooter({ children, className }: EhiModalFooterProps) {
  const size = useContext(ModalSizeContext);

  return (
    <footer
      className={cn(
        "flex shrink-0 items-center justify-center gap-3 bg-white",
        "shadow-[0_-8px_24px_16px_rgba(0,0,0,0.12)]",
        size === "large" ? "px-6 py-4" : "px-4 py-3",
        className,
      )}
    >
      {children}
    </footer>
  );
}
