import {
  AgentEventDraftSchema,
  AgentProviderSchema,
  CreateEventSchema,
  DEFAULT_TIMEZONE,
  type AgentEventDraft,
  type AgentProvider,
} from "@agenda/domain";
import { z } from "zod";
import { env } from "../config.js";
import { createServiceClient } from "../lib/supabase.js";
import { createEvent } from "./events.js";
import { getOwnerProfile } from "./profiles.js";

const TurnInputSchema = z.object({
  text: z.string().max(20_000).default(""),
  imageUrls: z.array(z.string().url()).max(12).default([]),
  threadId: z.string().uuid().optional(),
});

export type AgentTurnInput = z.infer<typeof TurnInputSchema>;

export type AgentMessageDto = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrls: string[];
  draft: AgentEventDraft | null;
  createdOccurrenceId: string | null;
  createdAt: string;
};

export type AgentThreadDto = {
  id: string;
  messages: AgentMessageDto[];
};

function httpError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

export async function isAgentEnabled(userId: string): Promise<boolean> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("agent_entitlements")
    .select("enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.enabled);
}

export async function requireAgentEnabled(userId: string): Promise<void> {
  if (!(await isAgentEnabled(userId))) {
    throw httpError("Agent not enabled", 403);
  }
}

export async function getAgentProvider(userId: string): Promise<AgentProvider> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("user_preferences")
    .select("agent_provider")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return AgentProviderSchema.catch("openai").parse(data?.agent_provider ?? "openai");
}

function mapMessage(row: Record<string, unknown>): AgentMessageDto {
  let draft: AgentEventDraft | null = null;
  if (row.draft) {
    const parsed = AgentEventDraftSchema.safeParse(row.draft);
    draft = parsed.success ? parsed.data : null;
  }
  return {
    id: String(row.id),
    role: row.role === "assistant" ? "assistant" : "user",
    content: String(row.content ?? ""),
    imageUrls: Array.isArray(row.image_urls) ? (row.image_urls as string[]) : [],
    draft,
    createdOccurrenceId: row.created_occurrence_id ? String(row.created_occurrence_id) : null,
    createdAt: String(row.created_at),
  };
}

export async function getLatestThread(userId: string): Promise<AgentThreadDto | null> {
  await requireAgentEnabled(userId);
  const db = createServiceClient();

  const { data: thread, error: threadError } = await db
    .from("agent_threads")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (threadError) throw new Error(threadError.message);
  if (!thread) return null;

  const { data: messages, error: messagesError } = await db
    .from("agent_messages")
    .select("*")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true })
    .limit(100);

  if (messagesError) throw new Error(messagesError.message);

  return {
    id: String(thread.id),
    messages: (messages ?? []).map((row) => mapMessage(row as Record<string, unknown>)),
  };
}

async function ensureThread(userId: string, threadId?: string): Promise<string> {
  const db = createServiceClient();

  if (threadId) {
    const { data, error } = await db
      .from("agent_threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw httpError("Thread not found", 404);
    return String(data.id);
  }

  const { data, error } = await db
    .from("agent_threads")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create thread");
  return String(data.id);
}

async function callAiService(input: {
  userId: string;
  provider: AgentProvider;
  text: string;
  imageUrls: string[];
  history: { role: string; content: string }[];
}): Promise<{ skillId: string; message: string; draft: AgentEventDraft | null }> {
  const response = await fetch(`${env.AI_SERVICE_URL}/v1/turns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AI_INTERNAL_TOKEN}`,
      Accept: "application/json",
    },
    body: JSON.stringify({
      userId: input.userId,
      provider: input.provider,
      text: input.text,
      imageUrls: input.imageUrls,
      history: input.history,
    }),
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = { detail: text };
    }
  }

  if (!response.ok) {
    const detail =
      typeof parsed === "object" && parsed && "detail" in parsed
        ? String((parsed as { detail: unknown }).detail)
        : `AI service error (${response.status})`;
    throw httpError(detail, response.status === 401 ? 502 : response.status >= 500 ? 502 : 400);
  }

  const body = z
    .object({
      skillId: z.string(),
      message: z.string(),
      draft: z.unknown().nullable().optional(),
    })
    .parse(parsed);

  let draft: AgentEventDraft | null = null;
  if (body.draft) {
    const draftResult = AgentEventDraftSchema.safeParse(body.draft);
    if (draftResult.success) draft = draftResult.data;
  }

  return {
    skillId: body.skillId,
    message: body.message,
    draft,
  };
}

export async function runAgentTurn(userId: string, input: unknown) {
  await requireAgentEnabled(userId);
  const parsed = TurnInputSchema.parse(input);
  if (!parsed.text.trim() && parsed.imageUrls.length === 0) {
    throw httpError("Pegá texto o una imagen", 400);
  }

  const provider = await getAgentProvider(userId);
  const threadId = await ensureThread(userId, parsed.threadId);
  const db = createServiceClient();

  const { data: historyRows } = await db
    .from("agent_messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(20);

  const history = (historyRows ?? []).map((row) => ({
    role: String(row.role),
    content: String(row.content ?? ""),
  }));

  const { error: userMsgError } = await db.from("agent_messages").insert({
    thread_id: threadId,
    user_id: userId,
    role: "user",
    content: parsed.text.trim() || "(imagen)",
    image_urls: parsed.imageUrls,
  });
  if (userMsgError) throw new Error(userMsgError.message);

  const ai = await callAiService({
    userId,
    provider,
    text: parsed.text,
    imageUrls: parsed.imageUrls,
    history,
  });

  const { data: assistantRow, error: assistantError } = await db
    .from("agent_messages")
    .insert({
      thread_id: threadId,
      user_id: userId,
      role: "assistant",
      content: ai.message,
      image_urls: [],
      draft: ai.draft,
    })
    .select("*")
    .single();

  if (assistantError || !assistantRow) {
    throw new Error(assistantError?.message ?? "Failed to store assistant message");
  }

  await db
    .from("agent_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  return {
    threadId,
    provider,
    skillId: ai.skillId,
    message: mapMessage(assistantRow as Record<string, unknown>),
  };
}

const CreateFromDraftSchema = z.object({
  messageId: z.string().uuid(),
  draft: AgentEventDraftSchema.optional(),
});

export async function createEventFromAgentDraft(userId: string, input: unknown) {
  await requireAgentEnabled(userId);
  const parsed = CreateFromDraftSchema.parse(input);
  const db = createServiceClient();

  const { data: message, error } = await db
    .from("agent_messages")
    .select("*")
    .eq("id", parsed.messageId)
    .eq("user_id", userId)
    .eq("role", "assistant")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!message) throw httpError("Message not found", 404);

  const draftSource = parsed.draft ?? message.draft;
  const draft = AgentEventDraftSchema.parse(draftSource);

  const profile = await getOwnerProfile(userId);
  const visibility = profile?.defaultEventVisibility ?? "shared";

  const createInput = CreateEventSchema.parse({
    title: draft.title,
    descriptionHtml: draft.descriptionHtml ?? undefined,
    visibility,
    editorialStatus: "published",
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    allDay: draft.allDay,
    timezone: draft.timezone || DEFAULT_TIMEZONE,
    locationMode: draft.locationMode,
    locationLabel: draft.locationLabel ?? null,
    onlineUrl: draft.onlineUrl ?? null,
    siteUrl: draft.siteUrl ?? null,
    ticketsUrl: draft.ticketsUrl ?? null,
    isFree: draft.isFree,
    priceLabel: draft.priceLabel ?? null,
    coverImageUrl: draft.coverImageUrl ?? null,
    galleryUrls: draft.galleryUrls ?? [],
    tagSlugs: draft.tagSlugs ?? [],
    language: "es",
  });

  const result = await createEvent(userId, createInput);
  const occurrenceId = result.occurrences[0]?.id ?? null;

  if (occurrenceId) {
    await db
      .from("agent_messages")
      .update({ created_occurrence_id: occurrenceId })
      .eq("id", parsed.messageId);
  }

  return result;
}
