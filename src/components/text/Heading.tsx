interface HeadingProps {
  className?: string;
  children: React.ReactNode;
}

export default function Heading({ className, children }: HeadingProps) {
  return (
    <h2
      data-aos="fade-up"
      data-aos-duration="1000"
      className={`font-display text-3xl md:text-4xl ${className}`}
    >
      {children}
    </h2>
  );
}
