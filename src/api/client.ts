import { getPreferenceValues, OAuth } from "@raycast/api";
import {
  FreshBooksUser,
  TimeEntriesResponse,
  TimeEntryResponse,
  ClientsResponse,
  ProjectsResponse,
  ServicesResponse,
  CreateTimeEntryData,
  UpdateTimeEntryData,
  TimeEntry,
} from "./types";

const API_BASE_URL = "https://api.freshbooks.com";
const REDIRECT_URI = "https://raycast.com/redirect/extension";
const REQUIRED_SCOPES =
  "user:profile:read user:time_entries:read user:time_entries:write user:clients:read user:projects:read user:billable_items:read";

interface Preferences {
  clientId: string;
  clientSecret: string;
}

class FreshBooksClient {
  private oauthClient: OAuth.PKCEClient;
  private businessId: number | null = null;
  private accountId: string | null = null;
  private identityId: number | null = null;

  constructor() {
    this.oauthClient = new OAuth.PKCEClient({
      redirectMethod: OAuth.RedirectMethod.Web,
      providerName: "FreshBooks",
      providerIcon: "extension-icon.png",
      providerId: "freshbooks",
      description: "Connect your FreshBooks account",
    });
  }

  async authorize(): Promise<string> {
    const { clientId, clientSecret } = getPreferenceValues<Preferences>();
    const tokenSet = await this.oauthClient.getTokens();

    if (tokenSet?.accessToken) {
      const hasAllScopes = tokenSet.scope && REQUIRED_SCOPES.split(" ").every((s) => tokenSet.scope!.includes(s));

      if (!hasAllScopes) {
        // Scope mismatch or unknown scopes — force re-authorization
        await this.oauthClient.removeTokens();
      } else if (tokenSet.isExpired()) {
        if (tokenSet.refreshToken) {
          try {
            await this.refreshTokens(tokenSet.refreshToken, clientId, clientSecret);
            const refreshed = await this.oauthClient.getTokens();
            if (refreshed?.accessToken) {
              return refreshed.accessToken;
            }
          } catch {
            await this.oauthClient.removeTokens();
          }
        } else {
          await this.oauthClient.removeTokens();
        }
      } else {
        return tokenSet.accessToken;
      }
    }

    // Full OAuth authorization flow
    const authRequest = await this.oauthClient.authorizationRequest({
      endpoint: "https://auth.freshbooks.com/oauth/authorize",
      clientId,
      scope: REQUIRED_SCOPES,
      extraParameters: {
        redirect_uri: REDIRECT_URI,
      },
    });

    const { authorizationCode } = await this.oauthClient.authorize(authRequest);

    const tokenResponse = await fetch(`${API_BASE_URL}/auth/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: authorizationCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        code_verifier: authRequest.codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokens = (await tokenResponse.json()) as OAuth.TokenResponse;
    await this.oauthClient.setTokens(tokens);
    return tokens.access_token;
  }

  private async refreshTokens(refreshToken: string, clientId: string, clientSecret: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const tokens = (await response.json()) as OAuth.TokenResponse;
    await this.oauthClient.setTokens(tokens);
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.authorize();
    return {
      Authorization: `Bearer ${token}`,
      "Api-Version": "alpha",
    };
  }

  private async getJsonHeaders(): Promise<Record<string, string>> {
    const headers = await this.getAuthHeaders();
    headers["Content-Type"] = "application/json";
    return headers;
  }

  async ensureUserInfo(): Promise<void> {
    if (this.businessId && this.accountId && this.identityId) {
      return;
    }

    const user = await this.getCurrentUser();
    if (user.business_memberships && user.business_memberships.length > 0) {
      const membership = user.business_memberships[0];
      this.businessId = membership.business.id;
      this.accountId = membership.business.account_id;
      this.identityId = user.id;
    } else {
      throw new Error("No business memberships found for user");
    }
  }

  async getCurrentUser(): Promise<FreshBooksUser> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/auth/api/v1/users/me`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    const data = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any).response;
  }

  async getRunningTimer(): Promise<TimeEntry | null> {
    await this.ensureUserInfo();
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/timetracking/business/${this.businessId}/time_entries?include_unlogged=true`,
      { headers },
    );

    if (!response.ok) {
      throw new Error(`Failed to get time entries: ${response.statusText}`);
    }

    const data = (await response.json()) as TimeEntriesResponse;
    const runningEntries = data.time_entries
      .filter((entry) => !entry.is_logged && entry.timer?.is_running)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    return runningEntries[0] || null;
  }

  async startTimer(data: Partial<CreateTimeEntryData> = {}): Promise<TimeEntry> {
    await this.ensureUserInfo();
    const headers = await this.getJsonHeaders();

    const timeEntry: CreateTimeEntryData = {
      is_logged: false,
      started_at: new Date().toISOString(),
      identity_id: this.identityId!,
      ...data,
    };

    const response = await fetch(`${API_BASE_URL}/timetracking/business/${this.businessId}/time_entries`, {
      method: "POST",
      headers,
      body: JSON.stringify({ time_entry: timeEntry }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to start timer: ${error}`);
    }

    const result = (await response.json()) as TimeEntryResponse;
    return result.time_entry;
  }

  async stopTimer(timeEntryId: number, data: Partial<UpdateTimeEntryData> = {}): Promise<TimeEntry> {
    await this.ensureUserInfo();
    const headers = await this.getJsonHeaders();

    const entry = await this.getTimeEntry(timeEntryId);
    if (!entry) {
      throw new Error("Time entry not found");
    }

    const startTime = new Date(entry.started_at).getTime();
    const duration = Math.floor((Date.now() - startTime) / 1000);

    const updateData: UpdateTimeEntryData = {
      is_logged: true,
      duration,
      started_at: entry.started_at,
      ...data,
    };

    if (entry.timer) {
      updateData.timer = { id: entry.timer.id.toString() };
    }

    const response = await fetch(
      `${API_BASE_URL}/timetracking/business/${this.businessId}/time_entries/${timeEntryId}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ time_entry: updateData }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to stop timer: ${error}`);
    }

    const result = (await response.json()) as TimeEntryResponse;
    return result.time_entry;
  }

  async getTimeEntry(id: number): Promise<TimeEntry | null> {
    await this.ensureUserInfo();
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/timetracking/business/${this.businessId}/time_entries/${id}`, {
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to get time entry: ${response.statusText}`);
    }

    const data = (await response.json()) as TimeEntryResponse;
    return data.time_entry;
  }

  async getClients(page = 1): Promise<ClientsResponse> {
    await this.ensureUserInfo();
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/accounting/account/${this.accountId}/users/clients?page=${page}&per_page=100`,
      { headers },
    );

    if (!response.ok) {
      throw new Error(`Failed to get clients: ${response.statusText}`);
    }

    return (await response.json()) as ClientsResponse;
  }

  async getProjects(page = 1): Promise<ProjectsResponse> {
    await this.ensureUserInfo();
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/projects/business/${this.businessId}/projects?page=${page}&per_page=100&include[]=services`,
      { headers },
    );

    if (!response.ok) {
      throw new Error(`Failed to get projects: ${response.statusText}`);
    }

    return (await response.json()) as ProjectsResponse;
  }

  async getServices(page = 1): Promise<ServicesResponse> {
    await this.ensureUserInfo();
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/comments/business/${this.businessId}/services?page=${page}&per_page=100`,
      { headers },
    );

    if (!response.ok) {
      throw new Error(`Failed to get services: ${response.statusText}`);
    }

    return (await response.json()) as ServicesResponse;
  }
}

export const freshBooksClient = new FreshBooksClient();
