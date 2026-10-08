import { Outlet, useLocation } from "react-router-dom";
import DesktopSidebar from "./DesktopSidebar";
import BottomNavBar from "./BottomNavBar";
import { CallProvider } from "@/features/calls/CallProvider";

export default function AppLayout() {
  const location = useLocation();

  // Ne pas afficher la navigation sur les pages publiques auth
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/join" ||
    location.pathname === "/join-space" ||
    location.pathname === "/scan" ||
    location.pathname === "/auth/confirm";

  if (isAuthPage) {
    return <Outlet />;
  }

  return (
    <CallProvider>
    <div className="min-h-screen flex bg-ov-bg text-ov-text">
      <DesktopSidebar />
      <main className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0 overflow-x-hidden">
        <div className="w-full max-w-md sm:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto flex-1">
          <Outlet />
        </div>
      </main>
      <BottomNavBar />
    </div>
    </CallProvider>
  );
}
