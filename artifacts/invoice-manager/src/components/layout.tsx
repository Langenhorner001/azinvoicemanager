import { Link, useLocation } from "wouter";
import { FileText, Users, Package, Moon, Sun, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as "light" | "dark") || "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  return { theme, toggleTheme: () => setTheme(t => t === "light" ? "dark" : "light") };
}

const navItems = [
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/products", label: "Products", icon: Package },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-30 h-full w-56 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 bg-foreground rounded flex items-center justify-center flex-shrink-0">
            <span className="text-background font-bold text-xs tracking-tight">AZ</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-sidebar-foreground leading-none">Invoice Manager</div>
            <div className="text-xs text-muted-foreground mt-0.5">AZ DISTRIBUTION</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5" data-testid="sidebar-nav">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location.startsWith(href);
            return (
              <Link key={href} href={href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  data-testid={`nav-${label.toLowerCase()}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Dark mode toggle */}
        <div className="px-4 py-3 border-t border-sidebar-border space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-sm font-medium"
            onClick={toggleTheme}
            data-testid="toggle-theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </Button>
          <div className="px-1 pb-1">
            <p className="text-[10px] text-muted-foreground/60 leading-tight">
              Developed by <span className="font-semibold text-muted-foreground">sonic</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-56 min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <button
            className="p-1.5 rounded-md hover:bg-accent"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="mobile-menu-toggle"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-foreground rounded flex items-center justify-center">
              <span className="text-background font-bold text-xs">AZ</span>
            </div>
            <span className="text-sm font-semibold">AZ DISTRIBUTION</span>
          </div>
          <button className="p-1.5 rounded-md hover:bg-accent" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
