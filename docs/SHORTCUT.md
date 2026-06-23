# Building the "Save to Photoblast Album" Shortcut

iOS won't let a web app write to the Photos library or create albums. A tiny,
one-time Shortcut bridges that gap — it runs entirely on the user's device, with
no cloud and no server. This guide builds it and produces a **signed iCloud
link** you can paste into the app (`VITE_SHORTCUT_URL`).

Takes about a minute. You only do this once; users just tap the link.

---

## 1. (Once) create the album

Photos app → **Albums** → **+** → **New Album** → name it exactly **Photoblast**
→ **Save** (you can skip adding any photos).

> On most current iOS versions the save action below will create the album on
> first run by itself — but making it once guarantees it exists. See step 5 for
> what to verify.

## 2. Build the shortcut

1. **Shortcuts** app → **+** (new shortcut).
2. **Add Action** → search **Save to Photo Album** → add it.
3. The action now reads *"Save [Shortcut Input] to [Recents]"*:
   - Tap **Recents** and choose **Photoblast**.
   - Make sure the input variable is **Shortcut Input** (tap it to set it if it's
     blank).
4. Rename the shortcut to **Save to Photoblast Album** (tap its name at the top).
5. Open **Details** (the ⓘ at the bottom, or the settings toggle):
   - Turn on **Show in Share Sheet**.
   - Set **Share Sheet Types** to **Images** only (turn the rest off). This keeps
     the share payload image-only, which is what the app sends.
6. Tap **Done**.

## 3. Get the iCloud link

- In **My Shortcuts**, tap the **⋯** on the shortcut (or long-press it) →
  **Share** → **Copy iCloud Link**.
- Shortcuts added from an iCloud link are trusted, so other people can install
  it straight from the link — no "Allow Untrusted Shortcuts" toggle required.

## 4. Wire it into the app

Build with the link set:

```bash
VITE_SHORTCUT_URL=https://www.icloud.com/shortcuts/XXXXXXXX npm run build
```

…or hard-code it in `src/config.ts` (`SHORTCUT_URL`). The in-app **Install the
Save Shortcut** button (in the Save-help sheet) then points at it, and onboarding
becomes: **Install → Add Shortcut → Done**.

## 5. Test on a device

1. In the app: take photos → **Save to iPhone** → in the share sheet tap
   **Save to Photoblast Album** → confirm they land in **Photos → Albums →
   Photoblast**.
2. **The one thing to verify:** install the shortcut from your iCloud link on a
   *second* device/account that has **no** "Photoblast" album, then run a save.
   - If the album is auto-created → great, users never think about albums.
   - If not → that device just needs the album made once (step 1). Consider
     adding a note to the app's help, or rebuild the shortcut with explicit
     **Create Album** logic if your iOS version exposes those actions.

That second-device behavior is the only part that varies by iOS version and
can't be confirmed without testing on hardware.
