export interface TimelineJob {
  dates: {
    from: string;
    to: string | null;
  };
}

export interface TimelineYear {
  year: number;
  position: number;
}

export interface TimelineJobPosition {
  startPosition: number;
  endPosition: number;
  durationInMonths: number;
  isShortTerm: boolean;
}

export function calculateTimelineYears(jobs: TimelineJob[]): TimelineYear[] {
  // Get min and max years from jobs
  const dates = jobs.flatMap((job) => [
    new Date(job.dates.from),
    job.dates.to ? new Date(job.dates.to) : new Date(),
  ]);

  const minYear = Math.min(...dates.map((d) => d.getFullYear()));
  const maxYear = Math.max(...dates.map((d) => d.getFullYear()));

  // Round down minYear to nearest 5
  const adjustedMinYear = Math.floor(minYear / 5) * 5;
  // Round up maxYear to nearest 5
  const adjustedMaxYear = Math.ceil(maxYear / 5) * 5;

  // Create array of years in reverse order (newest first), only including years divisible by 5
  return Array.from({ length: Math.floor((adjustedMaxYear - adjustedMinYear) / 5) + 1 }, (_, i) => {
    const year = adjustedMaxYear - i * 5;
    return {
      year,
      position: (adjustedMaxYear - year) / (adjustedMaxYear - adjustedMinYear),
    };
  });
}

export function calculateJobPosition(
  job: TimelineJob,
  minYear: number,
  maxYear: number
): TimelineJobPosition {
  const startDate = new Date(job.dates.from);
  const endDate = job.dates.to ? new Date(job.dates.to) : new Date();

  const totalTimespan = (maxYear - minYear + 1) * 12; // Total months
  const startMonths = (startDate.getFullYear() - minYear) * 12 + startDate.getMonth();
  const endMonths = (endDate.getFullYear() - minYear) * 12 + endDate.getMonth();

  // Calculate base positions
  const startPosition = startMonths / totalTimespan;
  const endPosition = endMonths / totalTimespan;

  const durationInMonths = endMonths - startMonths;
  const isShortTerm = durationInMonths < 12;

  return {
    startPosition: 1 - endPosition, // Invert for newest at top
    endPosition: 1 - startPosition,
    durationInMonths,
    isShortTerm,
  };
}

// Adjust positions to ensure minimum spacing
export function adjustPositionsWithMinSpacing(
  jobs: Array<{ position: TimelineJobPosition }>
): void {
  // Sort by start position (top to bottom)
  const sortedJobs = [...jobs].sort((a, b) => a.position.startPosition - b.position.startPosition);

  // Only add padding at start and end
  const padding = 0.05;
  const firstStart = Math.min(...sortedJobs.map((j) => j.position.startPosition));
  const lastEnd = Math.max(...sortedJobs.map((j) => j.position.endPosition));
  const range = lastEnd - firstStart;
  const scale = (1 - 2 * padding) / range;

  sortedJobs.forEach((job) => {
    job.position.startPosition = padding + (job.position.startPosition - firstStart) * scale;
    job.position.endPosition = padding + (job.position.endPosition - firstStart) * scale;
  });
}

export function formatDateRange(dateFrom: string, dateTo: string | null): string {
  const startDate = new Date(dateFrom).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
  const endDate = dateTo
    ? new Date(dateTo).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Present';
  return `${startDate} - ${endDate}`;
}
