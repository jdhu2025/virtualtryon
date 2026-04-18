import { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

interface PublicPageShellProps {
  children: ReactNode;
  sectionLinks?: boolean;
}

export function PublicPageShell({ children, sectionLinks = false }: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-[#f7efe7] text-[#1f2937]">
      <SiteHeader sectionLinks={sectionLinks} />
      {children}
      <SiteFooter />
    </div>
  );
}
