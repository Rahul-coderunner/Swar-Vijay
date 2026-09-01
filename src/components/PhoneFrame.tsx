export const CATEGORIES = ["Keyboard", "Tabla", "Octapad", "Banjo"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Centers content in a phone-width column so the app never looks like a desktop site. */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-darkgrad flex min-h-screen justify-center">
      <div className="flex min-h-screen w-full max-w-[430px] flex-col bg-background shadow-xl-sv">
        {children}
      </div>
    </div>
  );
}
