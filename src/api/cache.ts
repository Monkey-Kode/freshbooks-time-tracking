import { Cache } from "@raycast/api";
import { Client, Project, Service } from "./types";

const cache = new Cache();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

interface CachedData<T> {
  data: T;
  timestamp: number;
}

export class CacheManager {
  private static isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > CACHE_TTL;
  }

  static get<T>(key: string): T | null {
    const cached = cache.get(key);
    if (!cached) return null;

    try {
      const parsed = JSON.parse(cached) as CachedData<T>;
      if (this.isExpired(parsed.timestamp)) {
        cache.remove(key);
        return null;
      }
      return parsed.data;
    } catch {
      cache.remove(key);
      return null;
    }
  }

  static set<T>(key: string, data: T): void {
    const cacheData: CachedData<T> = {
      data,
      timestamp: Date.now(),
    };
    cache.set(key, JSON.stringify(cacheData));
  }

  static remove(key: string): void {
    cache.remove(key);
  }

  static clear(): void {
    cache.clear();
  }
}

export const CacheKeys = {
  CLIENTS: "freshbooks_clients",
  PROJECTS: "freshbooks_projects_v2",
  SERVICES: "freshbooks_services",
  RUNNING_TIMER: "freshbooks_running_timer",
  USER_INFO: "freshbooks_user_info",
} as const;

export function getCachedClients(): Client[] | null {
  return CacheManager.get<Client[]>(CacheKeys.CLIENTS);
}

export function setCachedClients(clients: Client[]): void {
  CacheManager.set(CacheKeys.CLIENTS, clients);
}

export function getCachedProjects(): Project[] | null {
  return CacheManager.get<Project[]>(CacheKeys.PROJECTS);
}

export function setCachedProjects(projects: Project[]): void {
  CacheManager.set(CacheKeys.PROJECTS, projects);
}

export function getCachedServices(): Service[] | null {
  return CacheManager.get<Service[]>(CacheKeys.SERVICES);
}

export function setCachedServices(services: Service[]): void {
  CacheManager.set(CacheKeys.SERVICES, services);
}

export function invalidateTimerCache(): void {
  CacheManager.remove(CacheKeys.RUNNING_TIMER);
}
