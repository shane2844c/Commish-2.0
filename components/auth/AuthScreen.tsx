import Image from "next/image";

type AuthScreenProps = {
  children: React.ReactNode;
};

/** Shared auth page shell — login and setup-username. */
export default function AuthScreen({ children }: AuthScreenProps) {
  return (
    <div className="commish-auth-page flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="commish-auth-wrap w-full max-w-md">
        <div className="commish-brand-mark mb-6 flex items-center justify-center gap-3">
          <Image
            src="/ctm-logo-mascot-plain.png"
            alt="Compare the Market mascot"
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
            priority
          />
          <p className="text-xl font-bold text-[var(--brand)]">
            compare<span className="font-medium text-[var(--brand-dark)]">themarket</span>
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
