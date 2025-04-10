export interface ColorSet {
  border: string;
  bg: string;
  fill: string;
}

export const statusColors = {
  slate: {
    border: 'border-slate-400',
    bg: 'bg-slate-400',
    fill: 'fill-slate-400',
  },
  red: {
    border: 'border-red-400',
    bg: 'bg-red-400',
    fill: 'fill-red-400',
  },
  green: {
    border: 'border-charge-green',
    bg: 'bg-charge-green',
    fill: 'fill-charge-green',
  },
  yellow: {
    border: 'border-yellow-400',
    bg: 'bg-yellow-400',
    fill: 'fill-yellow-400',
  },
  blue: {
    border: 'border-charge-blue',
    bg: 'bg-charge-blue',
    fill: 'fill-charge-blue',
  },
} as const;

export type StatusColorKey = keyof typeof statusColors;
