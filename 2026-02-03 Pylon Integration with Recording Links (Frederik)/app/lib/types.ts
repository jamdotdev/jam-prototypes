// Normalized issue type for both mock and Pylon data
export interface Issue {
  id: string;
  number: number;
  title: string;
  customer: string;
  status: string;
  assigneeId?: string;
  assigneeName?: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
}

// Pylon API response types
export interface PylonIssue {
  id: string;
  number: number;
  title: string;
  state: string;
  requester?: {
    name?: string;
    email?: string;
  };
  assignee?: {
    id: string;
    name?: string;
    email?: string;
  };
}

export interface PylonUser {
  id: string;
  name: string;
  email: string;
}

export interface PylonSearchResponse {
  data: PylonIssue[];
  request_id: string;
}

export interface PylonUsersResponse {
  data: PylonUser[];
  request_id: string;
}
