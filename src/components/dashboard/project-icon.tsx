import {
  Briefcase,
  Building2,
  Rocket,
  Target,
  TrendingUp,
  Heart,
  Star,
  Leaf,
  Zap,
  Globe,
  Code2,
  Megaphone,
  Users,
  Camera,
  ShoppingCart,
  Beaker,
  Podcast,
  DollarSign,
  Palette,
  Lightbulb,
  Dumbbell,
  Coffee,
  Music,
  Home,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  Briefcase,
  Building2,
  Rocket,
  Target,
  TrendingUp,
  Heart,
  Star,
  Leaf,
  Zap,
  Globe,
  Code2,
  Megaphone,
  Users,
  Camera,
  ShoppingCart,
  Beaker,
  Podcast,
  DollarSign,
  Palette,
  Lightbulb,
  Dumbbell,
  Coffee,
  Music,
  Home,
};

interface ProjectIconProps {
  icon?: string | null;
  iconColor?: string | null;
  className?: string;
}

export function ProjectIcon({ icon, iconColor, className }: ProjectIconProps) {
  const IconComponent = (icon && ICON_MAP[icon]) ? ICON_MAP[icon] : Briefcase;
  return (
    <IconComponent
      className={cn('h-4 w-4', className)}
      style={{ color: iconColor ?? undefined }}
    />
  );
}
