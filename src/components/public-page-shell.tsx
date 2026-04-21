import { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

interface PublicPageShellProps {
  children: ReactNode;
  sectionLinks?: boolean;
}

export function PublicPageShell({ children, sectionLinks = false }: PublicPageShellProps) {
  return (
    <div className="app-gradient-shell min-h-screen text-[#1f2937]">
      <div className="soft-grid pointer-events-none absolute inset-0 opacity-30" />
      <SiteHeader sectionLinks={sectionLinks} />
      <div className="relative z-10">{children}</div>
      <SiteFooter />
    </div>
  );
}
