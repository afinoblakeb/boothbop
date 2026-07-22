import { ArrowRight } from "lucide-react";
import { InstallSteps } from "../components/InstallCard";
import { Button, Callout, Heading } from "../ui";

/**
 * Dedicated landing for users arriving from the retired PhotoBlast app
 * (boothbop.com/?from=photoblast). Its only job is to convert them to the new
 * app, so it shows no photo-taking UI — just the logo, the install steps, and
 * the delete-the-old-icon reminder. The quiet "Continue" link is an escape
 * hatch into the normal app; tapping it persists so the landing never returns.
 */
export function MigrationScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-1 py-6 text-center">
      <p className="font-sans text-sm font-semibold text-accent">
        PhotoBlast has moved
      </p>
      <Heading as="h1" size="xl" variant="page" className="mt-1 text-text">
        Meet BoothBop.
      </Heading>
      <Callout tone="neutral" className="mt-5 w-full max-w-xs p-4 text-left">
        <Heading as="p" size="md" variant="page" className="text-text">
          Welcome back!
        </Heading>
        <p className="mt-1 font-sans text-sm leading-5 text-text-muted">
          PhotoBlast is now{" "}
          <span className="font-semibold text-accent">BoothBop</span> — same
          booth, new name. To keep it on your phone:
        </p>
        <InstallSteps />
        <p className="mt-3 font-sans text-sm leading-5 text-text-muted">
          Then <strong>delete the old PhotoBlast icon</strong> — it's retired
          and won't update.
        </p>
      </Callout>
      <Button
        variant="quiet"
        size="sm"
        onClick={onContinue}
        className="mt-4 text-text-muted"
      >
        Continue to BoothBop
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
