import { Outlet, useLocation } from "react-router-dom";
import DesktopSidebar from "./DesktopSidebar";
import BottomNavBar from "./BottomNavBar";
import { CallProvider } from "@/features/calls/CallProvider";

// Import cn en haut
import { cn } from "@/lib/utils";

export default function AppLayout() {
  const location = useLocation();

  // Pages publiques (pas de chrome de navigation)
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/join" ||
    location.pathname === "/join-space" ||
    location.pathname === "/scan" ||
    location.pathname === "/auth/confirm" ||
    location.pathname.startsWith("/share/") ||
    location.pathname === "/privacy" ||
    location.pathname === "/terms" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password";

  // Pages plein écran (chat, appels) — pas de BottomNavBar
  const isFullscreenPage =
    location.pathname.startsWith("/messages/") ||
    location.pathname.startsWith("/spaces/");

  if (isAuthPage) {
    return <Outlet />;
  }

  return (
    <CallProvider>
      <div className="min-h-screen flex bg-ov-bg text-ov-text">
        {/* Sidebar desktop (caché sur mobile) */}
        <DesktopSidebar />

        <main
          className={cn(
            "flex-1 flex flex-col min-w-0 overflow-x-hidden",
            !isFullscreenPage && "pb-16 lg:pb-0"
          )}
        >
          <div className="w-full max-w-md sm:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto flex-1 min-h-0">
            <Outlet />
          </div>
        </main>

        {/* BottomNavBar mobile (sauf pages plein écran) */}
        {!isFullscreenPage && <BottomNavBar />}
      </div>
    </CallProvider>
  );
}
