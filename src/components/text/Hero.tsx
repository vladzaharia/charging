interface HeroProps {
  className?: string;
  children: React.ReactNode;
}

export default function Hero({ className, children }: HeroProps) {
  return (
    <h1
      data-aos="fade-up"
      data-aos-duration="1000"
      className={`font-display text-5xl md:text-6xl font-bold ${className}`}
    >
      {children}
    </h1>
  );
}
