interface BackdropProps {
  className?: string;
  'data-aos'?: string;
  'data-aos-duration'?: string;
  'data-aos-delay'?: string;
  children: React.ReactNode;
}

export default function Backdrop({
  className,
  'data-aos': dataAos,
  'data-aos-duration': dataAosDuration,
  'data-aos-delay': dataAosDelay,
  children,
}: BackdropProps) {
  return (
    <div
      data-aos={dataAos}
      data-aos-duration={dataAosDuration}
      data-aos-delay={dataAosDelay}
      className={`bg-slate-900/10 border-slate-400/15 border-2 m-4 md:rounded-xl backdrop-blur backdrop-opacity-85 drop-shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}
