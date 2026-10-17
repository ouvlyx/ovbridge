import React from "react";
import { getInitials, getGradientForPseudo } from "@/lib/avatar";

interface AvatarProps {
  pseudo: string;
  size?: number;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  pseudo,
  size = 40,
  className = "",
}) => {
  const initials = getInitials(pseudo);
  const gradient = getGradientForPseudo(pseudo);

  const fontSize = Math.max(10, Math.round(size * 0.4));

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full font-semibold text-white shadow-sm shrink-0 select-none transition-all duration-200 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
        fontSize: `${fontSize}px`,
      }}
      aria-label={`Avatar de ${pseudo || "utilisateur"}`}
    >
      <span className="drop-shadow-sm tracking-wide">{initials}</span>
    </div>
  );
};

export default Avatar;
