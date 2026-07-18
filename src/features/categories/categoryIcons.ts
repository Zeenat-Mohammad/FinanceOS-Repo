import {
  Briefcase,
  Car,
  Clapperboard,
  CreditCard,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  Plane,
  Receipt,
  Repeat,
  Shield,
  ShoppingBag,
  Tag,
  TrendingUp,
  Tv,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  wallet: Wallet,
  receipt: Receipt,
  repeat: Repeat,
  'trending-up': TrendingUp,
  'credit-card': CreditCard,
  zap: Zap,
  bolt: Zap,
  utensils: Utensils,
  car: Car,
  home: Home,
  heart: Heart,
  'heart-pulse': Heart,
  'shopping-bag': ShoppingBag,
  ticket: Clapperboard,
  clapperboard: Clapperboard,
  'graduation-cap': GraduationCap,
  plane: Plane,
  shield: Shield,
  tv: Tv,
  landmark: Landmark,
  briefcase: Briefcase,
  tag: Tag
};

const NAME_HINTS: Array<{ match: RegExp; icon: string }> = [
  { match: /food|dining|grocery|restaurant/i, icon: 'utensils' },
  { match: /transport|car|uber|fuel|gas/i, icon: 'car' },
  { match: /shop|retail|amazon/i, icon: 'shopping-bag' },
  { match: /hous|rent|mortgage|home/i, icon: 'home' },
  { match: /salary|payroll|wage/i, icon: 'briefcase' },
  { match: /invest|stock|etf/i, icon: 'trending-up' },
  { match: /health|medical|doctor/i, icon: 'heart' },
  { match: /entertain|movie|game/i, icon: 'clapperboard' },
  { match: /educat|school|tuition/i, icon: 'graduation-cap' },
  { match: /travel|flight|hotel|vacation/i, icon: 'plane' },
  { match: /utilit|electric|water|internet/i, icon: 'zap' },
  { match: /insur/i, icon: 'shield' },
  { match: /subscri|netflix|spotify/i, icon: 'tv' },
  { match: /saving|emergency/i, icon: 'landmark' },
  { match: /debt|loan|credit/i, icon: 'credit-card' },
  { match: /income|transfer/i, icon: 'wallet' }
];

export const CATEGORY_ICON_OPTIONS = [
  'utensils',
  'car',
  'shopping-bag',
  'home',
  'briefcase',
  'trending-up',
  'heart',
  'clapperboard',
  'graduation-cap',
  'plane',
  'zap',
  'shield',
  'tv',
  'landmark',
  'credit-card',
  'wallet',
  'receipt',
  'repeat',
  'tag'
] as const;

export function resolveCategoryIconKey(name: string, icon?: string | null): string {
  if (icon && ICON_MAP[icon]) return icon;
  const hint = NAME_HINTS.find((h) => h.match.test(name));
  return hint?.icon ?? 'tag';
}

export function getCategoryIcon(name: string, icon?: string | null): LucideIcon {
  return ICON_MAP[resolveCategoryIconKey(name, icon)] ?? Tag;
}

export function typeAccent(type: string): { border: string; chip: string; bar: string } {
  if (type === 'income') {
    return { border: 'border-success/35', chip: 'bg-success/15 text-success', bar: 'bg-success' };
  }
  if (type === 'transfer') {
    return { border: 'border-accent/35', chip: 'bg-accent/15 text-accent', bar: 'bg-accent' };
  }
  if (type === 'archived') {
    return { border: 'border-border', chip: 'bg-muted/10 text-muted', bar: 'bg-secondary' };
  }
  return { border: 'border-purple/35', chip: 'bg-purple/15 text-purple', bar: 'bg-purple' };
}
