"use client";

import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetTitle = SheetPrimitive.Title;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SheetPrimitive.Portal>
    <SheetPrimitive.Overlay className="fixed inset-0 z-40 bg-[#1f2f47]/35 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-[280px] border-r border-[#d9e6f5] bg-[#f7fbff] shadow-[12px_0_36px_rgba(21,33,54,0.14)] outline-none",
        "data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        className,
      )}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="absolute top-3 right-3 grid size-9 place-items-center rounded-lg text-[#667791] transition-colors hover:bg-[#91c4ee]/20 hover:text-[#2b2f36] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#91c4ee]">
        <X aria-hidden="true" className="size-4" />
        <span className="sr-only">关闭菜单</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPrimitive.Portal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle };
