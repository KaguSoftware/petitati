// One structured Claude call: JSON validated against a zod schema. Server-side refusal fallbacks are
// on ("default" routes a declined request to Anthropic's recommended substitute model).
// The SDK is loaded on first use, so hand-off mode (no API key) runs without it installed.

export const MODEL = "claude-opus-5";

let client;
const usage = { calls: 0, input: 0, output: 0 };
export const claudeUsage = () => ({ ...usage });

export async function structured({ schema, system, prompt, effort = "medium", maxTokens = 16000 }) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const { betaZodOutputFormat } = await import("@anthropic-ai/sdk/helpers/beta/zod");
  client ??= new Anthropic({ maxRetries: 4 });
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    messages: [{ role: "user", content: prompt }],
    output_config: { effort, format: betaZodOutputFormat(schema) },
  });
  usage.calls++;
  usage.input += response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0);
  usage.output += response.usage.output_tokens;
  if (response.stop_reason === "refusal") throw new Error(`refused: ${response.stop_details?.category ?? "unknown"}`);
  if (response.stop_reason === "max_tokens") throw new Error("truncated: max_tokens reached");
  if (!response.parsed_output) throw new Error("no parsed output");
  return response.parsed_output;
}
