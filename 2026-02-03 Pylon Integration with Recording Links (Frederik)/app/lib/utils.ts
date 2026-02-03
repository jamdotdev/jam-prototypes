import type { Issue } from "./types";
import { PYLON_BASE_URL } from "./constants";

export function getStatusColor(status: string) {
  switch (status) {
    case "new":
      return "blue";
    case "waiting_on_you":
      return "orange";
    case "waiting_on_customer":
      return "yellow";
    case "on_hold":
      return "gray";
    case "closed":
      return "green";
    default:
      return "gray";
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case "new":
      return "New";
    case "waiting_on_you":
      return "Waiting on you";
    case "waiting_on_customer":
      return "Waiting on customer";
    case "on_hold":
      return "On hold";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

export function generateRecordingLink(
  issue: Issue,
  baseUrl: string,
  folderId?: string
): string {
  const params = new URLSearchParams();
  params.set("jam-title", `[${issue.number}] ${issue.title}`);
  params.set("jam-reference", `${PYLON_BASE_URL}/${issue.id}`);
  if (folderId?.trim()) {
    params.set("jam-folder", folderId.trim());
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}${params.toString()}`;
}

export function generateMessage(
  issue: Issue,
  link: string,
  template: string,
  agentName?: string
): string {
  const firstName = issue.customer.split(" ")[0];
  return template
    .replace(/{firstName}/g, firstName)
    .replace(/{customerName}/g, issue.customer)
    .replace(/{link}/g, link)
    .replace(/{issueNumber}/g, String(issue.number))
    .replace(/{issueTitle}/g, issue.title)
    .replace(/{agentName}/g, agentName || "");
}

export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 120) return "1 min ago";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 7200) return "1 hour ago";
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return "over a day ago";
}
