type CubikMarkProps = {
  size?: number;
  className?: string;
};

export function CubikMark({ size = 34, className }: CubikMarkProps) {
  return (
    <svg
      aria-label="CUBIK"
      className={className}
      height={size}
      role="img"
      viewBox="0 0 48 48"
      width={size}
    >
      <path d="M24 3 43 13.5 24 24 5 13.5 24 3Z" fill="currentColor" />
      <path d="M4 17 22 27v18L4 35V17Z" fill="currentColor" opacity=".82" />
      <path d="m26 27 18-10v10L26 37V27Z" fill="currentColor" opacity=".68" />
      <path d="m26 40 18-10v6L26 46v-6Z" fill="var(--accent)" />
    </svg>
  );
}
