import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ShoppingCart } from "lucide-react";
import { useCart, selectCartCount } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import { useIsNative } from "@/hooks/use-is-native";

type NavTo = "/" | "/cart";

function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center px-1",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * Navigation that adapts to the platform:
 *  - Native APK: bottom tab bar pinned to the 480px phone column (unchanged).
 *  - Web, small screens (< md): full-width bottom tab bar.
 *  - Web, md+ screens: a sticky top app bar with brand + horizontal links.
 */
export function BottomNav() {
  const isNative = useIsNative();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const count = useCart(selectCartCount);

  if (isNative) {
    return <PhoneBottomBar pathname={pathname} count={count} variant="native" />;
  }

  return (
    <>
      <DesktopTopNav pathname={pathname} count={count} />
      <PhoneBottomBar pathname={pathname} count={count} variant="web" />
    </>
  );
}

function PhoneBottomBar({
  pathname,
  count,
  variant,
}: {
  pathname: string;
  count: number;
  variant: "native" | "web";
}) {
  const Item = ({
    to,
    label,
    icon: Icon,
    showCount,
  }: {
    to: NavTo;
    label: string;
    icon: typeof Home;
    showCount?: boolean;
  }) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={cn(
          "flex flex-col items-center gap-1 py-2.5 text-xs no-select press-feedback",
          active ? "text-primary" : "text-muted-foreground"
        )}
      >
        <span className="relative">
          <Icon className={cn("h-6 w-6", active && "stroke-[2.4]")} />
          {showCount && <CountBadge count={count} className="absolute -top-1.5 -right-2" />}
        </span>
        <span className={cn(active && "font-semibold")}>{label}</span>
      </Link>
    );
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 z-40 border-t bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]",
        // Native: pinned to the centred 480px column. Web: full-width, and only
        // shown below the md breakpoint (the top bar takes over on desktop).
        variant === "native" ? "app-fixed-center" : "inset-x-0 md:hidden"
      )}
    >
      <div className="grid grid-cols-2">
        <Item to="/" label="Home" icon={Home} />
        <Item to="/cart" label="Cart" icon={ShoppingCart} showCount />
      </div>
    </nav>
  );
}

function DesktopTopNav({ pathname, count }: { pathname: string; count: number }) {
  const Item = ({
    to,
    label,
    icon: Icon,
    showCount,
  }: {
    to: NavTo;
    label: string;
    icon: typeof Home;
    showCount?: boolean;
  }) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium press-feedback transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <span className="relative">
          <Icon className="h-5 w-5" />
          {showCount && <CountBadge count={count} className="absolute -top-2 -right-2" />}
        </span>
        {label}
      </Link>
    );
  };

  return (
    <nav className="hidden md:block sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto max-w-6xl flex h-16 items-center justify-between gap-4 px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-xl bg-primary text-primary-foreground grid place-items-center font-black text-sm">
            S
          </span>
          <span className="text-lg font-bold tracking-tight">SSC</span>
        </Link>
        <div className="flex items-center gap-1">
          <Item to="/" label="Home" icon={Home} />
          <Item to="/cart" label="Cart" icon={ShoppingCart} showCount />
        </div>
      </div>
    </nav>
  );
}
