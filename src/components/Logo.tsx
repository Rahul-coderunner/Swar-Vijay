import logoUrl from "@/assets/swar-vijay-logo.jpg";

/** Swar Vijay brand mark — har page par dikhta hai. */
export function Logo({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="Swar Vijay Music Academy logo"
      className={`${className} shrink-0 rounded-full object-cover ring-1 ring-[#C9A227]/40`}
      loading="eager"
    />
  );
}
