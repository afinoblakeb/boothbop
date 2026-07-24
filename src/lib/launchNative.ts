import { registerPlugin } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

interface BoothBopLaunchPlugin {
  hide(): Promise<void>;
}

const BoothBopLaunch = registerPlugin<BoothBopLaunchPlugin>("BoothBopLaunch");

export async function hideNativeLaunchSurface(): Promise<void> {
  await SplashScreen.hide();
  await BoothBopLaunch.hide();
}
