import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { freshBooksClient } from "../api/client";
import { Client, Project, Service } from "../api/types";
import {
  getCachedClients,
  setCachedClients,
  getCachedProjects,
  setCachedProjects,
  getCachedServices,
  setCachedServices,
} from "../api/cache";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        // Try cache first
        const cached = getCachedClients();
        if (cached) {
          setClients(cached);
          setIsLoading(false);
          return;
        }

        // Fetch from API
        const response = await freshBooksClient.getClients();
        const clientList = response.response.result.clients.filter((client) => client.vis_state === 0);

        setClients(clientList);
        setCachedClients(clientList);
      } catch (error) {
        console.error("Failed to fetch clients:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch clients",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  return { clients, isLoading };
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const cached = getCachedProjects();
        if (cached) {
          setProjects(cached);
          setIsLoading(false);
          return;
        }

        const response = await freshBooksClient.getProjects();
        const projectList = response.projects.filter((project) => project.active);

        setProjects(projectList);
        setCachedProjects(projectList);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch projects",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return { projects, isLoading };
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Try cache first
        const cached = getCachedServices();
        if (cached) {
          setServices(cached);
          setIsLoading(false);
          return;
        }

        // Fetch from API
        const response = await freshBooksClient.getServices();
        const serviceList = response.services.filter((service) => service.vis_state === 0);

        setServices(serviceList);
        setCachedServices(serviceList);
      } catch (error) {
        console.error("Failed to fetch services:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch services",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, []);

  return { services, isLoading };
}
