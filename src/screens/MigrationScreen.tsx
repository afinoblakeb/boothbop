import { LOGO } from "../constants";
import { InstallSteps } from "../components/InstallCard";
import { Callout, Heading } from "../ui";

/**
 * Dedicated landing for users arriving from the retired PhotoBlast app
 * (boothbop.com/?from=photoblast). Its only job is to convert them to the new
 * app, so it shows no photo-taking UI — just the logo, the install steps, and
 * the delete-the-old-icon reminder. The quiet "Continue" link is an escape
 * hatch into the normal app; tapping it persists so the landing never returns.
 */
export function MigrationScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <img src={LOGO} alt="BoothBop" className="w-full max-w-xs" />
      <Callout tone="warning" className="mt-4 w-full max-w-xs p-4 text-left">
        <Heading as="p" size="lg" className="text-ink">
          Welcome back!
        </Heading>
        <p className="mt-1 font-sans text-sm text-brown">
          PhotoBlast is now{" "}
          <span className="font-bold text-orange">BoothBop</span> — same booth,
          new name. To keep it on your phone:
        </p>
        <InstallSteps />
        <p className="mt-3 font-sans text-sm text-brown">
          Then <strong>delete the old PhotoBlast icon</strong> — it's retired
          and won't update.
        </p>
      </Callout>
      <button
        onClick={onContinue}
        className="mt-6 font-sans text-xs uppercase tracking-widest text-warmgray underline"
      >
        Continue to BoothBop
      </button>
    </div>
  );
}
