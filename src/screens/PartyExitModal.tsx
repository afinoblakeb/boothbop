import { useState } from "react";
import { cleanPartyPasscodeInput } from "../lib/partyMode";
import { Button, Callout, Heading, OverlayScreen } from "../ui";

export function PartyExitModal({
  error,
  onVerify,
  onClose,
}: {
  error: string | null;
  onVerify: (code: string) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");

  return (
    <OverlayScreen title="Exit Guest Mode" onClose={onClose}>
      <div className="mt-6 border-2 border-ink bg-paper p-4">
        <Heading as="h3" size="lg" className="text-ink">
          Host Code
        </Heading>
        <p className="mt-2 font-sans text-sm leading-relaxed text-brown">
          Enter the 4-digit host code to leave Guest Mode. Use iOS Guided Access
          when the device itself needs to stay locked.
        </p>
        <input
          value={code}
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="done"
          maxLength={4}
          onChange={(e) => setCode(cleanPartyPasscodeInput(e.target.value))}
          className="mt-4 h-14 w-full border-2 border-ink bg-cream px-4 text-center font-display text-3xl tracking-wide text-ink outline-none focus:ring-4 focus:ring-orange/35"
          aria-label="Guest Mode exit code"
        />
        {error && (
          <Callout tone="error" className="mt-3 px-3 py-2">
            <p className="font-sans text-sm text-orange-dark">{error}</p>
          </Callout>
        )}
        <div className="mt-4 grid gap-3">
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => onVerify(code)}
          >
            Exit Guest Mode
          </Button>
          <Button variant="secondary" size="md" fullWidth onClick={onClose}>
            Keep Booth Running
          </Button>
        </div>
      </div>
    </OverlayScreen>
  );
}
