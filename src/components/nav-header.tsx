"use client";

import { useAppState } from "@/lib/store";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { TrendingUp, Upload, BarChart3, LineChart, GitBranch, Wallet, FileSpreadsheet, FileText, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", icon: Upload, label: "Upload" },
  { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { href: "/forecast", icon: LineChart, label: "Forecast" },
  { href: "/scenarios", icon: GitBranch, label: "Scenarios" },
  { href: "/working-capital", icon: Wallet, label: "Working Capital" },
  { href: "/variance", icon: FileSpreadsheet, label: "Variance" },
  { href: "/report", icon: FileText, label: "Report" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function NavHeader() {
  const pathname = usePathname();
  const { state } = useAppState();
  const hasData = !!state.analysis;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 h-14">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm tracking-tight">FlexFinToolkit</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const isDisabled = item.href !== "/" && !hasData;
            const Icon = item.icon;

            if (isDisabled) {
              return (
                <span
                  key={item.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground/40 cursor-not-allowed rounded-md"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <ThemeSwitcher />
      </div>
    </header>
  );
}
