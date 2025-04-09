import { useChargerStatus } from '../../hooks/useChargerStatus';

interface ChargerButtonProps {
  className?: string;
}

export const ChargerButton = ({ className = '' }: ChargerButtonProps) => {
  const { status } = useChargerStatus();
  const hasAvailableConnector = status?.connectors?.some(c => c.status === 'Available' || c.status === 'Preparing') ?? false;

  const baseClasses = "flex flex-row items-center font-display py-4 px-6 gap-4 backdrop-blur backdrop-opacity-85 drop-shadow-lg transition-all duration-300 rounded-xl";
  const enabledClasses = "text-charge-green hover:text-slate-900 bg-slate-900/10 hover:bg-charge-green/75 border-charge-green border-2";
  const disabledClasses = "text-slate-400 bg-slate-900/10 border-slate-400 border-2 cursor-not-allowed";

  if (!hasAvailableConnector) {
    return (
      <button
        className={`${baseClasses} ${disabledClasses} ${className}`}
        disabled
      >
        Charging Unavailable
      </button>
    );
  }

  return (
    <a
      className={`${baseClasses} ${enabledClasses} ${className}`}
      href="/begin"
      data-astro-prefetch
    >
      Begin Charging
    </a>
  );
};
