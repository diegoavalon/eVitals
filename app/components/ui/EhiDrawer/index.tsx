import { Drawer } from "@base-ui/react/drawer";
import { type ReactNode } from "react";
import { cn } from "../../utils/cn";

function CloseIcon() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

export type EhiDrawerProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function EhiDrawer({
  open,
  onOpenChange,
  title,
  children,
  className,
}: EhiDrawerProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-on-surface/50",
            "transition-opacity duration-300 ease-out",
            "data-starting-style:opacity-0 data-ending-style:opacity-0",
          )}
        />
        <Drawer.Popup
          className={cn(
            "fixed right-0 top-0 bottom-0 z-50 flex flex-col bg-surface shadow-[-8px_0_32px_rgba(0,0,0,0.18)] outline-none",
            "w-[80vw] max-w-5xl",
            "transition-transform duration-300 ease-out",
            "data-starting-style:translate-x-full data-ending-style:translate-x-full",
            className,
          )}
        >
          <header className="flex shrink-0 items-center gap-4 border-b border-border p-4">
            {title && (
              <Drawer.Title className="min-w-0 flex-1 truncate font-poppins font-bold text-[18px] text-on-surface">
                {title}
              </Drawer.Title>
            )}
            {!title && <div className="flex-1" />}
            <Drawer.Close
              className="shrink-0 rounded-full hover:opacity-70 focus-visible:outline-2 focus-visible:outline-warning"
              aria-label="Close drawer"
            >
              <CloseIcon />
            </Drawer.Close>
          </header>

          <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
