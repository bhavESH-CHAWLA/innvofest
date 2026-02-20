const OpenAI = require("openai");

const DEFAULT_SYSTEM_PROMPT =
  "You are InnoVest risk copilot. Return practical, concise financial risk insights.";

function getProviderOrder() {
  const configured = process.env.AI_PROVIDER_ORDER || "openai,groq,huggingface";
  return configured
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function toAiError({ status = 500, message, details, provider, canFallback = false }) {
  const err = new Error(message || "AI provider request failed.");
  err.status = status;
  err.details = details || "Unknown AI failure";
  err.provider = provider || "unknown";
  err.canFallback = canFallback;
  return err;
}

function extractTextFromChoices(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const textChunk = content.find((entry) => entry?.type === "text" && typeof entry?.text === "string");
    if (textChunk?.text) return textChunk.text;
  }
  return "";
}

function shouldTryNextProvider(error) {
  if (!error) return false;
  return Boolean(
    error.canFallback ||
      error.status >= 500 ||
      error.status === 429 ||
      error.status === 408 ||
      error.status === 425
  );
}

async function callOpenAI(message, systemPrompt) {
  if (!process.env.OPENAI_API_KEY) {
    throw toAiError({
      status: 503,
      provider: "openai",
      message: "OpenAI key missing",
      details: "OPENAI_API_KEY is not configured",
      canFallback: true,
    });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
    });

    const text = extractTextFromChoices(response);
    if (!text) {
      throw toAiError({
        status: 502,
        provider: "openai",
        message: "OpenAI returned empty content.",
        details: "No text in response choices.",
        canFallback: true,
      });
    }
    return text;
  } catch (error) {
    if (error?.provider) throw error;

    const status = error?.status || 500;
    const providerMessage = error?.error?.message || error?.message || "Unknown AI failure";
    throw toAiError({
      status,
      provider: "openai",
      message: status === 401 ? "OpenAI authentication failed." : "OpenAI request failed.",
      details: providerMessage,
      canFallback: status === 429 || status >= 500,
    });
  }
}

async function callGroq(message, systemPrompt) {
  if (!process.env.GROQ_API_KEY) {
    throw toAiError({
      status: 503,
      provider: "groq",
      message: "Groq key missing",
      details: "GROQ_API_KEY is not configured",
      canFallback: true,
    });
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = data?.error?.message || data?.message || `Groq HTTP ${response.status}`;
    throw toAiError({
      status: response.status,
      provider: "groq",
      message: "Groq request failed.",
      details,
      canFallback: response.status === 429 || response.status >= 500,
    });
  }

  const text = extractTextFromChoices(data);
  if (!text) {
    throw toAiError({
      status: 502,
      provider: "groq",
      message: "Groq returned empty content.",
      details: "No text in response choices.",
      canFallback: true,
    });
  }
  return text;
}

async function callHuggingFace(message, systemPrompt) {
  if (!process.env.HUGGINGFACE_API_KEY) {
    throw toAiError({
      status: 503,
      provider: "huggingface",
      message: "Hugging Face key missing",
      details: "HUGGINGFACE_API_KEY is not configured",
      canFallback: true,
    });
  }

  const model = process.env.HF_MODEL || "google/flan-t5-large";
  const prompt = `${systemPrompt || DEFAULT_SYSTEM_PROMPT}\n\nUser:\n${message}\n\nAssistant:`;
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 240,
        temperature: 0.2,
        return_full_text: false,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    const details = data?.error || `Hugging Face HTTP ${response.status}`;
    throw toAiError({
      status: response.status || 500,
      provider: "huggingface",
      message: "Hugging Face request failed.",
      details,
      canFallback: response.status === 429 || response.status >= 500 || String(details).includes("loading"),
    });
  }

  const text =
    (Array.isArray(data) && typeof data[0]?.generated_text === "string" && data[0].generated_text) ||
    (typeof data?.generated_text === "string" && data.generated_text) ||
    "";

  if (!text.trim()) {
    throw toAiError({
      status: 502,
      provider: "huggingface",
      message: "Hugging Face returned empty content.",
      details: "No generated_text found.",
      canFallback: true,
    });
  }
  return text.trim();
}

async function askAI(message, systemPrompt) {
  const providers = getProviderOrder();
  const errors = [];

  for (const provider of providers) {
    try {
      if (provider === "openai") return await callOpenAI(message, systemPrompt);
      if (provider === "groq") return await callGroq(message, systemPrompt);
      if (provider === "huggingface") return await callHuggingFace(message, systemPrompt);
    } catch (error) {
      errors.push(`[${error.provider || provider}] ${error.details || error.message}`);
      if (!shouldTryNextProvider(error)) {
        throw error;
      }
    }
  }

  const combined = errors.length
    ? errors.join(" | ")
    : "No AI provider configured. Set OPENAI_API_KEY or GROQ_API_KEY or HUGGINGFACE_API_KEY.";
  throw toAiError({
    status: 503,
    provider: "multi",
    message: "All AI providers failed.",
    details: combined,
    canFallback: false,
  });
}

module.exports = { askAI };
