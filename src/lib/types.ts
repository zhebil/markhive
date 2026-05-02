export type TextBlock = {
  type: "text";
  text: string;
};

export type ThinkingBlock = {
  type: "thinking";
  thinking: string;
};

export type ToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
};

export type ToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: Array<{ type: "text"; text: string } | { type: string; [k: string]: unknown }>;
};

export type ImageBlock = {
  type: "image";
  source: { type: string; url?: string; [k: string]: unknown };
};

export type ToolUseArtifactBlock = {
  type: "tool_use_artifact";
  id: string;
  title: string;
  language: string;
  content: string;
};

export type UnknownBlock = {
  type: string;
  [k: string]: unknown;
};

export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ToolUseBlock
  | ToolResultBlock
  | ImageBlock
  | ToolUseArtifactBlock
  | UnknownBlock;

export type Attachment = {
  file_name: string;
  [k: string]: unknown;
};

export type ChatMessage = {
  sender: "human" | "assistant";
  content: ContentBlock[];
  attachments?: Attachment[];
};

export type Conversation = {
  uuid: string;
  name: string;
  model: string;
  created_at: string;
  chat_messages: ChatMessage[];
};
