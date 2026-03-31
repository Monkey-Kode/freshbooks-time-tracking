import {
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  showHUD,
  Icon,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { useTimer } from "./hooks/useTimer";
import { freshBooksClient } from "./api/client";
import { invalidateTimerCache } from "./api/cache";

export default function Command() {
  const { runningTimer, isLoading } = useTimer();
  const [starting, setStarting] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (isLoading || started.current) return;
    if (runningTimer) return;

    started.current = true;
    setStarting(true);

    freshBooksClient
      .startTimer()
      .then(() => {
        invalidateTimerCache();
        return showHUD("Timer Started");
      })
      .then(() => popToRoot())
      .catch((error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to start timer",
          message: error instanceof Error ? error.message : String(error),
        });
        setStarting(false);
      });
  }, [isLoading, runningTimer]);

  if (!isLoading && runningTimer) {
    return (
      <Detail
        markdown="# Timer Already Running\n\nStop and log the current timer before starting a new one."
        actions={
          <ActionPanel>
            <Action
              title="Stop & Log Timer"
              icon={Icon.Stop}
              onAction={() => {
                launchCommand({ name: "stop-timer", type: LaunchType.UserInitiated });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return <Detail isLoading={isLoading || starting} markdown="" />;
}
