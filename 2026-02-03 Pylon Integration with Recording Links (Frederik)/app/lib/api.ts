import type { Issue, Agent, PylonIssue, PylonSearchResponse, PylonUsersResponse } from "./types";
import { PYLON_API_URL } from "./constants";

function normalizePylonIssue(pylonIssue: PylonIssue): Issue {
  return {
    id: pylonIssue.id,
    number: pylonIssue.number,
    title: pylonIssue.title,
    customer:
      pylonIssue.requester?.name || pylonIssue.requester?.email || "Unknown",
    status: pylonIssue.state,
    assigneeId: pylonIssue.assignee?.id,
    assigneeName: pylonIssue.assignee?.name || pylonIssue.assignee?.email,
  };
}

export async function fetchPylonIssues(
  apiToken: string,
  assigneeId?: string
): Promise<Issue[]> {
  const filters: Record<string, unknown> = {
    field: "state",
    operator: "in",
    values: ["new", "waiting_on_you", "waiting_on_customer"],
  };

  const body: Record<string, unknown> = { limit: 50 };
  if (assigneeId) {
    body.filters = {
      operator: "and",
      filters: [
        filters,
        { field: "assignee_id", operator: "equals", value: assigneeId },
      ],
    };
  } else {
    body.filters = filters;
  }

  const response = await fetch(`${PYLON_API_URL}/issues/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  const data: PylonSearchResponse = await response.json();
  return data.data.map(normalizePylonIssue);
}

export async function fetchPylonAgents(apiToken: string): Promise<Agent[]> {
  const response = await fetch(`${PYLON_API_URL}/users/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ limit: 100 }),
  });

  if (!response.ok) {
    return [];
  }

  const data: PylonUsersResponse = await response.json();
  return data.data.map((u) => ({ id: u.id, name: u.name, email: u.email }));
}
