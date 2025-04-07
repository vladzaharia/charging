const jobColors = [
  // Red & Sky blue pair
  {
    bg: 'bg-rose-500',
    border: 'border-rose-400',
    text: 'text-rose-400',
    shadow: 'shadow-rose-500/70',
    darkText: 'text-rose-500/75',
    lightBorder: 'border-rose-300/75',
    ring: 'ring-rose-400',
    color: 'rgb(244, 63, 94)',
  },
  {
    bg: 'bg-sky-500',
    border: 'border-sky-400',
    text: 'text-sky-400',
    shadow: 'shadow-sky-500/70',
    darkText: 'text-sky-500/75',
    lightBorder: 'border-sky-300/75',
    ring: 'ring-sky-400',
    color: 'rgb(14, 165, 233)',
  },

  // Pink & Yellow-Green pair
  {
    bg: 'bg-pink-500',
    border: 'border-pink-400',
    text: 'text-pink-400',
    shadow: 'shadow-pink-500/70',
    darkText: 'text-pink-500/75',
    lightBorder: 'border-pink-300/75',
    ring: 'ring-pink-400',
    color: 'rgb(236, 72, 153)',
  },
  {
    bg: 'bg-lime-500',
    border: 'border-lime-400',
    text: 'text-lime-400',
    shadow: 'shadow-lime-500/70',
    darkText: 'text-lime-500/75',
    lightBorder: 'border-lime-300/75',
    ring: 'ring-lime-400',
    color: 'rgb(132, 204, 22)',
  },

  // Orange & Cyan pair
  {
    bg: 'bg-orange-500',
    border: 'border-orange-400',
    text: 'text-orange-400',
    shadow: 'shadow-orange-500/70',
    darkText: 'text-orange-500/75',
    lightBorder: 'border-orange-300/75',
    ring: 'ring-orange-400',
    color: 'rgb(249, 115, 22)',
  },
  {
    bg: 'bg-cyan-500',
    border: 'border-cyan-400',
    text: 'text-cyan-400',
    shadow: 'shadow-cyan-500/70',
    darkText: 'text-cyan-500/75',
    lightBorder: 'border-cyan-300/75',
    ring: 'ring-cyan-400',
    color: 'rgb(6, 182, 212)',
  },

  // Purple & Green pair
  {
    bg: 'bg-violet-500',
    border: 'border-violet-400',
    text: 'text-violet-400',
    shadow: 'shadow-violet-500/70',
    darkText: 'text-violet-500/75',
    lightBorder: 'border-violet-300/75',
    ring: 'ring-violet-400',
    color: 'rgb(139, 92, 246)',
  },
  {
    bg: 'bg-emerald-500',
    border: 'border-emerald-400',
    text: 'text-emerald-400',
    shadow: 'shadow-emerald-500/70',
    darkText: 'text-emerald-500/75',
    lightBorder: 'border-emerald-300/75',
    ring: 'ring-emerald-400',
    color: 'rgb(16, 185, 129)',
  },

  // Purple-Blue going into Orange
  {
    bg: 'bg-indigo-500',
    border: 'border-indigo-400',
    text: 'text-indigo-400',
    shadow: 'shadow-indigo-500/70',
    darkText: 'text-indigo-500/75',
    lightBorder: 'border-indigo-300/75',
    ring: 'ring-indigo-400',
    color: 'rgb(99, 102, 241)',
  },
];

export function getJobColor(index: number) {
  return jobColors[index % jobColors.length]!;
}

export function getComputedColor(index: number) {
  return jobColors[index % jobColors.length]!.color;
}
