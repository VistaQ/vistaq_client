/**
 * Design Tokens — single source of truth for JS-accessible design values.
 * Tailwind color tokens live in index.html. Use these for non-Tailwind contexts
 * (Recharts fills, inline styles, conditional class lookups).
 */

// ---------------------------------------------------------------------------
// Chart Colors (Zurich palette — used in Recharts Cell fills)
// ---------------------------------------------------------------------------
export const CHART_COLORS = [
  '#23366F', // blue-600  — primary
  '#3D6DB5', // blue-500
  '#648FCC', // blue-400
  '#00C9B1', // teal accent
  '#10B981', // green-500
];

// ---------------------------------------------------------------------------
// Calendar / Item Type Styles
// Used by MyCalendar.tsx TYPE_CONFIG — import from here instead of redefining.
// ---------------------------------------------------------------------------
export type CalItemType = 'event' | 'coaching' | 'appointment';

export const ITEM_TYPE_STYLES: Record<CalItemType, { bg: string; text: string; dot: string; label: string }> = {
  event:       { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500',   label: 'Event' },
  coaching:    { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Coaching' },
  appointment: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Appointment' },
};

export const CANCELLED_ITEM_STYLE = { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-400', label: 'Cancelled' };

// ---------------------------------------------------------------------------
// Modal Header Gradients (by item/action type)
// ---------------------------------------------------------------------------
export const MODAL_HEADER_GRADIENTS = {
  event:       'bg-gradient-to-r from-blue-600 to-indigo-600',
  coaching:    'bg-gradient-to-r from-green-600 to-emerald-600',
  appointment: 'bg-gradient-to-r from-purple-600 to-violet-600',
  admin:       'bg-blue-600',
  default:     'bg-blue-600',
};

// ---------------------------------------------------------------------------
// Badge Tier Colors (default fallback — real tiers come from AdminRewards config)
// ---------------------------------------------------------------------------
export const DEFAULT_BADGE_TIERS = [
  { id: 'b1', name: 'Rookie',           threshold: 0,     color: 'text-gray-400',   bg: 'bg-gray-100'  },
  { id: 'b2', name: 'Rising Star',      threshold: 1000,  color: 'text-blue-500',   bg: 'bg-blue-100'  },
  { id: 'b3', name: 'Bronze Achiever',  threshold: 3000,  color: 'text-amber-700',  bg: 'bg-amber-100' },
  { id: 'b4', name: 'Silver Elite',     threshold: 8000,  color: 'text-gray-400',   bg: 'bg-gray-100'  },
  { id: 'b5', name: 'Gold Master',      threshold: 15000, color: 'text-yellow-500', bg: 'bg-yellow-100'},
  { id: 'b6', name: 'Platinum Legend',  threshold: 25000, color: 'text-indigo-500', bg: 'bg-indigo-100'},
];

// ---------------------------------------------------------------------------
// Semantic Status Colors (badge/pill variants)
// Maps to: bg-{color}-100 text-{color}-700 pattern used by Badge component
// ---------------------------------------------------------------------------
export const STATUS_COLORS = {
  success: { bg: 'bg-green-100',  text: 'text-green-700'  },
  error:   { bg: 'bg-red-100',    text: 'text-red-700'    },
  warning: { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  info:    { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  neutral: { bg: 'bg-gray-100',   text: 'text-gray-700'   },
  purple:  { bg: 'bg-purple-100', text: 'text-purple-700' },
} as const;

export type StatusVariant = keyof typeof STATUS_COLORS;

// ---------------------------------------------------------------------------
// Chart axis/label fill (hex — used in Recharts Label style prop)
// ---------------------------------------------------------------------------
export const CHART_LABEL_FILL = '#6B7280'; // gray-500 equivalent
