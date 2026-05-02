export class ClaudeAuthError extends Error {
  constructor() {
    super("Not authenticated with Claude");
    this.name = "ClaudeAuthError";
  }
}

export class ClaudeApiError extends Error {
  status: number;
  constructor(status: number) {
    super(`Claude API error: ${status}`);
    this.name = "ClaudeApiError";
    this.status = status;
  }
}

export class ClaudeNoOrgError extends Error {
  constructor() {
    super("No Claude org found on this account");
    this.name = "ClaudeNoOrgError";
  }
}

export class ClaudeNetworkError extends Error {
  cause: unknown;
  constructor(cause: unknown) {
    super("Network error reaching claude.ai");
    this.name = "ClaudeNetworkError";
    this.cause = cause;
  }
}

async function claudeFetch(url: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "include" });
  } catch (err) {
    throw new ClaudeNetworkError(err);
  }
  if (res.status === 401) throw new ClaudeAuthError();
  if (!res.ok) throw new ClaudeApiError(res.status);
  return res;
}

export async function fetchOrgId(): Promise<string> {
  const res = await claudeFetch("https://claude.ai/api/organizations");
  const orgs = await res.json();
  if (!orgs?.length) throw new ClaudeNoOrgError();
  return orgs[0].uuid;
}

export async function fetchConversation(orgId: string, chatId: string): Promise<unknown> {
  const url = `https://claude.ai/api/organizations/${orgId}/chat_conversations/${chatId}?tree=True&rendering_mode=raw`;
  const res = await claudeFetch(url);
  return res.json();
}
