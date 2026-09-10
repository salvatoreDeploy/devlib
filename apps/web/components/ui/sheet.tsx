"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

// Drawer/Sheet (docs/FRONTEND.md): painel lateral direito único, 432px,
// usado nos fluxos de criação/detalhe do Sprint 4. Overlay com fade
// 180ms, painel com slide 220ms (tw-animate-css), conforme o pacote de
// design original citado em "Interações e comportamento".

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentProps<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    data-slot="sheet-overlay"
    className={cn(
      "fixed inset-0 z-50 bg-overlay duration-180 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentProps<typeof SheetPrimitive.Content> & {
    showCloseButton?: boolean;
  }
>(({ className, children, showCloseButton = false, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      data-slot="sheet-content"
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex h-full w-108 flex-col gap-4.5 border-l border-border bg-popover py-6.5 px-7 text-popover-foreground duration-220 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <SheetPrimitive.Close className="absolute top-4.5 right-4.5 text-text-faint hover:text-foreground">
          <X className="size-4" />
          <span className="sr-only">Fechar</span>
        </SheetPrimitive.Close>
      )}
    </SheetPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="sheet-header"
    className={cn("flex flex-col gap-1.5", className)}
    {...props}
  />
);

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentProps<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    data-slot="sheet-title"
    className={cn(
      "text-[19px] font-bold tracking-[-0.015em] text-foreground",
      className,
    )}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentProps<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    data-slot="sheet-description"
    className={cn("text-[13px] leading-[1.6] text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

const SheetFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="sheet-footer"
    className={cn("mt-auto flex justify-end gap-2.25 pt-0.5", className)}
    {...props}
  />
);

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
};
