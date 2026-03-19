import { List, Icon, Color, ActionPanel, Action, launchCommand, LaunchType } from "@raycast/api";
import { useTimer } from "./hooks/useTimer";
import { formatElapsedTime } from "./utils/formatters";
import { useEffect, useState } from "react";

export default function Command() {
  const { runningTimer, isLoading, stopTimer, startTimer, refresh } = useTimer();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_currentTime, setCurrentTime] = useState(Date.now());

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTimerStatus = () => {
    if (!runningTimer) {
      return {
        title: "No Timer Running",
        subtitle: "Press Enter to start a new timer",
        icon: { source: Icon.Clock, tintColor: Color.SecondaryText },
        accessories: [],
      };
    }

    const elapsed = formatElapsedTime(runningTimer.started_at);
    const accessories = [];

    if (runningTimer.client_id) {
      accessories.push({ text: "Has Client", icon: Icon.Person });
    }
    if (runningTimer.project_id) {
      accessories.push({ text: "Has Project", icon: Icon.Document });
    }
    if (runningTimer.note) {
      accessories.push({ text: runningTimer.note, icon: Icon.Text });
    }

    return {
      title: "Timer Running",
      subtitle: `Started at ${new Date(runningTimer.started_at).toLocaleTimeString()}`,
      icon: { source: Icon.Clock, tintColor: Color.Green },
      accessories: [{ text: elapsed, icon: Icon.Stopwatch }, ...accessories],
    };
  };

  const status = getTimerStatus();

  return (
    <List isLoading={isLoading}>
      <List.Item
        {...status}
        actions={
          <ActionPanel>
            {runningTimer ? (
              <>
                <Action
                  title="Stop Timer"
                  icon={Icon.Stop}
                  onAction={async () => {
                    await stopTimer();
                    refresh();
                  }}
                />
                <Action
                  title="Stop Timer with Details"
                  icon={Icon.Document}
                  onAction={() => {
                    launchCommand({ name: "stop-timer", type: LaunchType.UserInitiated });
                  }}
                />
              </>
            ) : (
              <>
                <Action
                  title="Start Timer"
                  icon={Icon.Play}
                  onAction={async () => {
                    await startTimer();
                    refresh();
                  }}
                />
                <Action
                  title="Start New Timer"
                  icon={Icon.Document}
                  onAction={() => {
                    launchCommand({ name: "start-timer", type: LaunchType.UserInitiated });
                  }}
                />
              </>
            )}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={refresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
