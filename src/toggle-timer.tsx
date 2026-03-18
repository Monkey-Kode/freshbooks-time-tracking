import { showHUD, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { freshBooksClient } from "./api/client";
import { invalidateTimerCache } from "./api/cache";
import { formatDuration, getElapsedTime } from "./utils/formatters";

interface Preferences {
  showHUD?: boolean;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const showHUDPref = preferences.showHUD !== false;

  try {
    // Check for running timer
    const runningTimer = await freshBooksClient.getRunningTimer();

    if (runningTimer) {
      // Stop the timer
      const duration = getElapsedTime(runningTimer.started_at);
      await freshBooksClient.stopTimer(runningTimer.id);
      invalidateTimerCache();

      const message = `Timer stopped - ${formatDuration(duration)} logged`;

      if (showHUDPref) {
        await showHUD(message);
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Timer Stopped",
          message: `${formatDuration(duration)} logged`,
        });
      }
    } else {
      // Start a new timer
      await freshBooksClient.startTimer();
      invalidateTimerCache();

      const message = "Timer started";

      if (showHUDPref) {
        await showHUD(message);
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Timer Started",
          message: "Timer is now running",
        });
      }
    }
  } catch (error) {
    console.error("Failed to toggle timer:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to toggle timer",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
