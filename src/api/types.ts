export interface FreshBooksUser {
  id: number;
  profile: {
    first_name: string;
    last_name: string;
    email: string;
  };
  business_memberships: Array<{
    business: {
      id: number;
      name: string;
      account_id: string;
    };
    role: string;
  }>;
}

export interface Timer {
  id: number;
  is_running: boolean;
}

export interface TimeEntry {
  id: number;
  note: string | null;
  duration: number | null;
  project_id: number | null;
  client_id: number | null;
  service_id?: number | null;
  is_logged: boolean;
  started_at: string;
  active: boolean;
  timer: Timer | null;
  identity_id?: number;
  billable?: boolean;
  billed?: boolean;
  internal?: boolean;
}

export interface TimeEntriesResponse {
  time_entries: TimeEntry[];
  meta: {
    pages: number;
    total_logged: number;
    total_unbilled: number;
    per_page: number;
    total: number;
    page: number;
  };
}

export interface TimeEntryResponse {
  time_entry: TimeEntry;
}

export interface Client {
  id: number;
  organization: string;
  fname: string;
  lname: string;
  email: string;
  currency_code: string;
  userid: number;
  uuid: string;
  updated: string;
  vis_state: number;
}

export interface ClientsResponse {
  response: {
    result: {
      clients: Client[];
      page: number;
      pages: number;
      per_page: number;
      total: number;
    };
  };
}

export interface Project {
  id: number;
  title: string;
  description: string;
  client_id: number | null;
  project_type: string;
  active: boolean;
  budget?: number;
  fixed_price?: string;
  billing_method?: string;
  project_manager_id?: number;
  complete?: boolean;
  internal?: boolean;
  services?: Service[];
}

export interface ProjectsResponse {
  projects: Project[];
  meta: {
    total: number;
    per_page: number;
    page: number;
    pages: number;
  };
}

export interface Service {
  id: number;
  name: string;
  billable: boolean;
  vis_state: number;
}

export interface ServicesResponse {
  services: Service[];
  meta: {
    total: number;
    per_page: number;
    page: number;
    pages: number;
  };
}

export interface CreateTimeEntryData {
  is_logged: boolean;
  duration?: number;
  note?: string;
  started_at: string;
  client_id?: number | string;
  project_id?: number | string;
  service_id?: number | string;
  identity_id?: number | string;
}

export interface UpdateTimeEntryData extends Partial<CreateTimeEntryData> {
  timer?: {
    id: string;
  };
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at: number;
}
