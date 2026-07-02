type AuthTabsProps = {
  active: "login" | "signup";
  onLogin: () => void;
  onSignup: () => void;
};

export default function AuthTabs({ active, onLogin, onSignup }: AuthTabsProps) {
  return (
    <div className="commish-auth-tabs mt-6 flex rounded-lg border border-[var(--border)] p-1">
      <button
        type="button"
        onClick={onLogin}
        className={`commish-auth-tab flex-1 rounded px-3 py-2 text-sm font-medium ${
          active === "login"
            ? "is-active bg-[var(--brand)] text-white"
            : "text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)]"
        }`}
      >
        Log in
      </button>
      <button
        type="button"
        onClick={onSignup}
        className={`commish-auth-tab flex-1 rounded px-3 py-2 text-sm font-medium ${
          active === "signup"
            ? "is-active bg-[var(--brand)] text-white"
            : "text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)]"
        }`}
      >
        Create account
      </button>
    </div>
  );
}
