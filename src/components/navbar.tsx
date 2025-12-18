"use client";

import Link from "next/link";
import { FileText, RotateCcw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { ModeToggle } from "@/components/mode-toggle";
import { Progress } from "@/components/ui/progress";

interface NavbarProps {
  /** Progress percentage (0-100). When provided, enables builder mode on mobile. */
  progress?: number;
  /** Callback for reset action. When provided, shows reset button on mobile. */
  onReset?: () => void;
  /** Callback for preview action. When provided, shows preview button on mobile. */
  onPreview?: () => void;
}

export function Navbar({ progress, onReset, onPreview }: NavbarProps) {
  const isBuilderMode = progress !== undefined;

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80">
      <div className={isBuilderMode ? "" : "border-b border-border"}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <span className="font-sans text-xl font-semibold text-foreground">
                OpenWork
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden items-center gap-4 md:flex">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      href="#features"
                      className={navigationMenuTriggerStyle()}
                    >
                      Features
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      href="#templates"
                      className={navigationMenuTriggerStyle()}
                    >
                      Templates
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      href="#pricing"
                      className={navigationMenuTriggerStyle()}
                    >
                      Pricing
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>

              <div className="flex items-center gap-2">
                <ModeToggle />
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
                <Button size="sm">Get Started</Button>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="flex items-center gap-2 md:hidden">
              {isBuilderMode ? (
                <>
                  {onReset && (
                    <Button variant="outline" size="icon" onClick={onReset}>
                      <RotateCcw />
                    </Button>
                  )}
                  {onPreview && (
                    <Button variant="default" size="icon" onClick={onPreview}>
                      <Eye />
                    </Button>
                  )}
                  <ModeToggle />
                </>
              ) : (
                <>
                  <ModeToggle />
                  <Button size="sm">Get Started</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar as bottom border in builder mode (mobile only) */}
      {isBuilderMode && (
        <>
          {/* Mobile: progress bar as border */}
          <Progress
            value={progress}
            className="h-1 rounded-none bg-border md:hidden"
          />
          {/* Desktop: regular border */}
          <div className="hidden md:block border-b border-border" />
        </>
      )}
    </nav>
  );
}
