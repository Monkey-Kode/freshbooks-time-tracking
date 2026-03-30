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
import { useState, useEffect, useMemo } from "react";
import { useClients, useProjects, useServices } from "./hooks/useApiData";
import { useTimer } from "./hooks/useTimer";
import { freshBooksClient } from "./api/client";
import { invalidateTimerCache } from "./api/cache";
import { formatElapsedTime, formatDuration } from "./utils/formatters";

export default function Command() {
  const { runningTimer, isLoading: isLoadingTimer } = useTimer();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [billable, setBillable] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_currentTime, setCurrentTime] = useState(Date.now());

  const { clients, isLoading: isLoadingClients } = useClients();
  const { projects, isLoading: isLoadingProjects } = useProjects();
  const { services, isLoading: isLoadingServices } = useServices();

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Set initial values from running timer
  useEffect(() => {
    if (runningTimer) {
      if (runningTimer.client_id) {
        setSelectedClientId(runningTimer.client_id.toString());
      }
      if (runningTimer.project_id) {
        setSelectedProjectId(runningTimer.project_id.toString());
      }
      if (runningTimer.service_id) {
        setSelectedServiceId(runningTimer.service_id.toString());
      }
      if (runningTimer.billable !== undefined) {
        setBillable(runningTimer.billable);
      }
    }
  }, [runningTimer]);

  const filteredServices = useMemo(() => {
    if (selectedProjectId) {
      const project = projects.find((p) => p.id.toString() === selectedProjectId);
      return (project?.services ?? []).filter((s) => s.vis_state === 0);
    }
    return services;
  }, [selectedProjectId, projects, services]);

  if (!isLoadingTimer && !runningTimer) {
    return (
      <Detail
        markdown="# No Timer Running\n\nThere is no timer currently running. Start a timer first before you can stop it."
        actions={
          <ActionPanel>
            <Action
              title="Start Timer"
              icon={Icon.Play}
              onAction={() => {
                launchCommand({ name: "start-timer", type: LaunchType.UserInitiated });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  async function handleSubmit(values: {
    client_id: string;
    project_id: string;
    service_id: string;
    note: string;
    billable: boolean;
  }) {
    if (!runningTimer) return;

    setIsSubmitting(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = {
        note: values.note || undefined,
        billable: values.billable,
      };

      if (values.client_id) {
        data.client_id = parseInt(values.client_id);
      }
      if (values.project_id) {
        data.project_id = parseInt(values.project_id);
      }
      if (values.service_id) {
        data.service_id = parseInt(values.service_id);
      }

      const stoppedTimer = await freshBooksClient.stopTimer(runningTimer.id, data);
      invalidateTimerCache();

      const duration = stoppedTimer.duration || 0;
      const timeStr = formatDuration(duration);

      await showToast({
        style: Toast.Style.Success,
        title: "Timer Stopped",
        message: `Logged ${timeStr}`,
      });

      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop timer",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = isLoadingTimer || isLoadingClients || isLoadingProjects || isLoadingServices;
  const elapsedTime = runningTimer ? formatElapsedTime(runningTimer.started_at) : "";

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Stop Timer & Log Time" icon={Icon.Stop} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Elapsed Time" text={elapsedTime} />

      <Form.Separator />

      <Form.Dropdown
        id="client_id"
        title="Client"
        placeholder="Select a client (optional)"
        value={selectedClientId}
        onChange={(val) => {
          setSelectedClientId(val);
          setSelectedProjectId("");
          setSelectedServiceId("");
        }}
      >
        <Form.Dropdown.Item value="" title="No Client" />
        {clients.map((client) => (
          <Form.Dropdown.Item
            key={client.id}
            value={client.id.toString()}
            title={client.organization || `${client.fname} ${client.lname}`}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="project_id"
        title="Project"
        placeholder="Select a project (optional)"
        value={selectedProjectId}
        onChange={(val) => {
          setSelectedProjectId(val);
          setSelectedServiceId("");
        }}
      >
        <Form.Dropdown.Item value="" title="No Project" />
        {projects
          .filter((project) => !selectedClientId || project.client_id?.toString() === selectedClientId)
          .map((project) => (
            <Form.Dropdown.Item key={project.id} value={project.id.toString()} title={project.title} />
          ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="service_id"
        title="Service"
        placeholder="Select a service (optional)"
        value={selectedServiceId}
        onChange={setSelectedServiceId}
      >
        <Form.Dropdown.Item value="" title="No Service" />
        {filteredServices.map((service) => (
          <Form.Dropdown.Item key={service.id} value={service.id.toString()} title={service.name} />
        ))}
      </Form.Dropdown>

      <Form.TextArea id="note" title="Notes" placeholder="What did you work on?" />

      <Form.Checkbox id="billable" label="Billable" value={billable} onChange={setBillable} />
    </Form>
  );
}
