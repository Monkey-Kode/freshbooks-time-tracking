import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Icon,
  Detail,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useState } from "react";
import { useTimer } from "./hooks/useTimer";
import { freshBooksClient } from "./api/client";
import { invalidateTimerCache } from "./api/cache";
import { formatElapsedTime } from "./utils/formatters";

export default function Command() {
  const { runningTimer, isLoading: isLoadingTimer } = useTimer();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoadingTimer && runningTimer) {
    const elapsed = formatElapsedTime(runningTimer.started_at);
    return (
      <Detail
        markdown={`# Timer Already Running\n\nA timer has been running for **${elapsed}**.\n\nStop and log it before starting a new one.`}
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

  async function handleSubmit(values: { note: string }) {
    setIsSubmitting(true);

    try {
      await freshBooksClient.startTimer({
        note: values.note || undefined,
      });
      invalidateTimerCache();

      await showToast({
        style: Toast.Style.Success,
        title: "Timer Started",
        message: values.note || "Timer is now running",
      });

      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to start timer",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isLoadingTimer || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="note" title="Notes" placeholder="What are you working on?" />
    </Form>
  );
}
