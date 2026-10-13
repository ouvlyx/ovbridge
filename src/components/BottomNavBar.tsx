import { Link, useLocation } from "react-router-dom";
import { Laptop, MessageSquare, HardDrive, Clipboard, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNavBar() {
  const location = useLocation();

  const items = [
    { label: "Appareils", path: "/devices", icon: Laptop },
    { label: "Messages", path: "/messages", icon: MessageSquare },
    { label: "Espace", path: "/workspace", icon: HardDrive },
    { label: "Presse-papiers", path: "/clipboard", icon: Clipboard },
    { label: "Profil", path: "/profile", icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-ov-surface/95 backdrop-blur border-t border-ov-border px-2 py-1 flex justify-around items-center">
      {items.map((item) => {
        const Icon = item.icon;
        const active = location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-colors",
              active ? "text-ov-primary" : "text-ov-muted hover:text-ov-text"
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
