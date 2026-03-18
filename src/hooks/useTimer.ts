import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { freshBooksClient } from "../api/client";
import { TimeEntry } from "../api/types";
import { invalidateTimerCache } from "../api/cache";

export function useTimer() {
  const [runningTimer, setRunningTimer] = useState<TimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRunningTimer = async () => {
    try {
      setIsLoading(true);
      const timer = await freshBooksClient.getRunningTimer();
      setRunningTimer(timer);
    } catch (error) {
      console.error("Failed to fetch running timer:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch timer",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startTimer = async (data?: Partial<TimeEntry>) => {
    try {
      const newTimer = await freshBooksClient.startTimer({
        note: data?.note || undefined,
        client_id: data?.client_id || undefined,
        project_id: data?.project_id || undefined,
        service_id: data?.service_id || undefined,
      });
      setRunningTimer(newTimer);
      invalidateTimerCache();
      showToast({
        style: Toast.Style.Success,
        title: "Timer started",
        message: data?.note || "Timer is now running",
      });
      return newTimer;
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to start timer",
        message: String(error),
      });
      throw error;
    }
  };

  const stopTimer = async (data?: Partial<TimeEntry>) => {
    if (!runningTimer) {
      throw new Error("No timer is running");
    }

    try {
      const stoppedTimer = await freshBooksClient.stopTimer(runningTimer.id, {
        note: data?.note || undefined,
        client_id: data?.client_id || undefined,
        project_id: data?.project_id || undefined,
        service_id: data?.service_id || undefined,
      });
      setRunningTimer(null);
      invalidateTimerCache();

      const duration = stoppedTimer.duration || 0;
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      showToast({
        style: Toast.Style.Success,
        title: "Timer stopped",
        message: `Logged ${timeStr}`,
      });
      return stoppedTimer;
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop timer",
        message: String(error),
      });
      throw error;
    }
  };

  const toggleTimer = async () => {
    if (runningTimer) {
      return stopTimer();
    } else {
      return startTimer();
    }
  };

  useEffect(() => {
    fetchRunningTimer();
  }, []);

  return {
    runningTimer,
    isLoading,
    startTimer,
    stopTimer,
    toggleTimer,
    refresh: fetchRunningTimer,
  };
}
