import type { ReactNode } from "react";
import { PARTY_RESET_SECONDS, type PartyResetSeconds } from "../lib/partyMode";
import { anyAutosaveOn, type AutosaveSettings } from "../lib/settings";
import { BrandIcon, GearIcon, SlidersIcon } from "../icons";
import {
  Button,
  Callout,
  Heading,
  OverlayScreen,
  SegmentedControl,
  Toggle,
} from "../ui";

export function PartySetupScreen({
  isPro,
  native,
  partyMode,
  partyPasscode,
  partyResetSeconds,
  autosave,
  styleSummary,
  onPartyMode,
  onPartyPasscode,
  onPartyResetSeconds,
  onBrowseTemplates,
  onOpenSettings,
  onUnlockPro,
  onStart,
  onClose,
}: {
  isPro: boolean;
  native: boolean;
  partyMode: boolean;
  partyPasscode: string;
  partyResetSeconds: PartyResetSeconds;
  autosave: AutosaveSettings;
  styleSummary: string;
  onPartyMode: (on: boolean) => void;
  onPartyPasscode: (passcode: string) => void;
  onPartyResetSeconds: (seconds: PartyResetSeconds) => void;
  onBrowseTemplates: () => void;
  onOpenSettings: () => void;
  onUnlockPro: () => void;
  onStart: () => void;
  onClose: () => void;
}) {
  const autosaveFormats = [
    autosave.strip ? "Strip" : null,
    autosave.grid ? "Grid" : null,
    autosave.gif ? "GIF" : null,
    autosave.video ? "Video" : null,
  ].filter(Boolean);
  const autosaveReady = native && anyAutosaveOn(autosave);
  const primaryLabel = !isPro
    ? "Start Pro"
    : partyMode
      ? "Start Booth"
      : "Turn On Party Mode";

  function primaryAction() {
    if (!isPro) {
      onUnlockPro();
      return;
    }
    if (!partyMode) {
      onPartyMode(true);
      return;
    }
    onStart();
  }

  return (
    <OverlayScreen title="Party Setup" onClose={onClose}>
      <p className="mt-1 font-sans text-xs uppercase tracking-wide text-warmgray">
        Prep the booth before guests start shooting.
      </p>

      {!isPro && (
        <Callout tone="info" className="mt-4 px-4 py-3">
          <p className="font-sans text-sm text-ink">
            Party Mode is a Pro event flow with host controls, guest reset, and
            locked-down booth navigation.
          </p>
        </Callout>
      )}

      <div className="mt-5 grid gap-3">
        <SetupPanel
          title="Event look"
          status="Ready"
          statusTone="ready"
          icon={<SlidersIcon className="h-5 w-5" />}
        >
          <p className="font-sans text-sm text-brown">{styleSummary}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={onBrowseTemplates}
            className="mt-3"
          >
            Browse Templates
          </Button>
        </SetupPanel>

        <SetupPanel
          title="Guest reset"
          status={partyResetSeconds === 0 ? "Manual" : `${partyResetSeconds}s`}
          statusTone={partyResetSeconds === 0 ? "neutral" : "ready"}
          icon={<BrandIcon name="camera" className="h-5 w-5" />}
        >
          <SegmentedControl
            fullWidth
            label="Party Mode auto-reset"
            value={partyResetSeconds}
            onChange={onPartyResetSeconds}
            options={PARTY_RESET_SECONDS.map((seconds) => ({
              value: seconds,
              label: seconds === 0 ? "Off" : `${seconds}s`,
            }))}
            itemClassName="py-2 text-sm"
          />
        </SetupPanel>

        <SetupPanel
          title="Photos save"
          status={autosaveReady ? "On" : "Off"}
          statusTone={autosaveReady ? "ready" : "warning"}
          icon={<BrandIcon name="gallery" className="h-5 w-5" />}
        >
          <p className="font-sans text-sm text-brown">
            {native
              ? autosaveReady
                ? `${autosaveFormats.join(", ")} to ${
                    autosave.dest === "album" ? "BoothBop album" : "camera roll"
                  }.`
                : "Auto-save is off for this event."
              : "Auto-save is available in the iOS app."}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenSettings}
            className="mt-3"
          >
            <GearIcon className="h-4 w-4" />
            Settings
          </Button>
        </SetupPanel>

        <SetupPanel
          title="Guest lock"
          status={partyMode ? "On" : "Off"}
          statusTone={partyMode ? "ready" : "warning"}
          icon={<GearIcon className="h-5 w-5" />}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-sans text-sm text-brown">
                BoothBop hides editing and navigation while Party Mode is on.
              </p>
            </div>
            {isPro ? (
              <Toggle on={partyMode} onChange={onPartyMode} />
            ) : (
              <button
                onClick={onUnlockPro}
                className="shrink-0 border-2 border-ink bg-cream px-3 py-2 font-display text-base uppercase tracking-wide text-orange-dark transition active:translate-y-px"
              >
                Pro
              </button>
            )}
          </div>

          {isPro && (
            <label className="mt-3 block">
              <span className="font-sans text-xs font-bold uppercase tracking-widest text-warmgray">
                Host exit code
              </span>
              <input
                value={partyPasscode}
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                onChange={(e) => onPartyPasscode(e.target.value)}
                disabled={partyMode}
                className="mt-1 h-11 w-full border-2 border-ink bg-cream px-3 text-center font-display text-2xl tracking-wide text-ink outline-none focus:ring-4 focus:ring-orange/35 disabled:opacity-50"
                aria-label="Party Mode host exit code"
              />
            </label>
          )}

          <p className="mt-3 font-sans text-xs leading-snug text-warmgray">
            Use iOS Guided Access for a device-level lock before handing over
            the phone.
          </p>
        </SetupPanel>
      </div>

      <Button
        variant="primary"
        size="md"
        fullWidth
        onClick={primaryAction}
        className="mt-5"
      >
        {primaryLabel}
      </Button>
    </OverlayScreen>
  );
}

function SetupPanel({
  title,
  status,
  statusTone,
  icon,
  children,
}: {
  title: string;
  status: string;
  statusTone: "ready" | "warning" | "neutral";
  icon: ReactNode;
  children: ReactNode;
}) {
  const statusClass =
    statusTone === "ready"
      ? "border-teal text-teal"
      : statusTone === "warning"
        ? "border-orange-dark text-orange-dark"
        : "border-ink/40 text-brown";
  return (
    <section className="border-2 border-ink bg-paper px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <Heading as="h3" size="md" className="min-w-0 text-ink">
            {title}
          </Heading>
        </div>
        <span
          className={`shrink-0 border-2 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide ${statusClass}`}
        >
          {status}
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
