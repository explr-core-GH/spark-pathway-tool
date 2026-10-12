import { Cloud, Heart, Leaf, Moon, Star, Sun, Waves, Zap, type LucideIcon } from "lucide-react";

/** Picture-login shapes and colors. Mirrors AVATAR_SHAPES / AVATAR_COLORS in explore-logins.functions.ts. */
export const SHAPE_ICONS: Record<string, LucideIcon> = {
  star: Star,
  leaf: Leaf,
  bolt: Zap,
  wave: Waves,
  sun: Sun,
  heart: Heart,
  moon: Moon,
  cloud: Cloud,
};

export const SHAPE_LABELS: Record<string, string> = {
  star: "star",
  leaf: "leaf",
  bolt: "lightning bolt",
  wave: "wave",
  sun: "sun",
  heart: "heart",
  moon: "moon",
  cloud: "cloud",
};

export const AVATAR_COLOR_STYLES: Record<string, { bg: string; fg: string; ring: string }> = {
  mint: { bg: "#D9F6EC", fg: "#0C5A43", ring: "#9EEBD0" },
  amber: { bg: "#FBEEDC", fg: "#8A5A0A", ring: "#D9952A" },
  coral: { bg: "#FBEBE6", fg: "#9C3320", ring: "#D9523B" },
  sky: { bg: "#DBEBF1", fg: "#1F5F78", ring: "#2E8FB0" },
  violet: { bg: "#E5E3F1", fg: "#3F3A82", ring: "#5C56B0" },
  gold: { bg: "#F6E8C3", fg: "#8F6410", ring: "#D9A531" },
};

type ShapeIconProps = { shape: string; size?: number; className?: string; strokeWidth?: number };

/** A single shape glyph. Decorative by default; wrap it with text for a name. */
export function ShapeIcon({ shape, size = 24, className = "", strokeWidth = 2 }: ShapeIconProps) {
  const Icon = SHAPE_ICONS[shape] ?? Star;
  return (
    <Icon width={size} height={size} strokeWidth={strokeWidth} className={className} aria-hidden />
  );
}

type AvatarTileProps = {
  shape: string;
  color: string;
  size?: number;
  selected?: boolean;
  className?: string;
};

/** Round picture tile: a colored disc with the student's shape. */
export function AvatarTile({
  shape,
  color,
  size = 96,
  selected = false,
  className = "",
}: AvatarTileProps) {
  const c = AVATAR_COLOR_STYLES[color] ?? AVATAR_COLOR_STYLES.mint;
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: c.bg,
        color: c.fg,
        boxShadow: selected
          ? `0 0 0 4px #FDFDF9, 0 0 0 7px ${c.ring}`
          : `inset 0 0 0 2px ${c.ring}`,
      }}
    >
      <ShapeIcon shape={shape} size={Math.round(size * 0.5)} strokeWidth={2} />
    </span>
  );
}
