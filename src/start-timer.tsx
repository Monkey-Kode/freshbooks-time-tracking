import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { useState } from "react";
import { freshBooksClient } from "./api/client";
import { invalidateTimerCache } from "./api/cache";

export default function Command() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { note: string }) {
    setIsSubmitting(true);

    try {
      // Stop any existing running timer before starting a new one
      const runningTimer = await freshBooksClient.getRunningTimer();
      if (runningTimer) {
        await freshBooksClient.stopTimer(runningTimer.id);
      }

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
      isLoading={isSubmitting}
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
