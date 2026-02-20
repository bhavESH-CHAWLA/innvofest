function scoreFromPrompt(prompt) {
  const text = String(prompt || "").toLowerCase();
  let score = 45;

  if (text.includes("debt")) score += 15;
  if (text.includes("loss") || text.includes("declining")) score += 12;
  if (text.includes("delay") || text.includes("deadline")) score += 8;
  if (text.includes("fraud") || text.includes("compliance")) score += 14;
  if (text.includes("low revenue") || text.includes("cash burn")) score += 10;
  if (text.includes("steady growth") || text.includes("stable")) score -= 14;
  if (text.includes("low debt")) score -= 12;

  return Math.max(8, Math.min(92, score));
}

function levelFromScore(score) {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

function driversFromPrompt(prompt) {
  const text = String(prompt || "").toLowerCase();
  const drivers = [];

  if (text.includes("debt")) drivers.push("Leverage pressure");
  if (text.includes("loss") || text.includes("declining")) drivers.push("Profitability deterioration");
  if (text.includes("cash")) drivers.push("Liquidity stress");
  if (text.includes("delay")) drivers.push("Execution timeline risk");
  if (text.includes("fraud") || text.includes("compliance")) drivers.push("Control and compliance exposure");
  if (!drivers.length) drivers.push("Baseline market uncertainty");

  return drivers;
}

export function predictRiskDemo(prompt) {
  const score = scoreFromPrompt(prompt);
  const riskLevel = levelFromScore(score);
  const drivers = driversFromPrompt(prompt);
  const action = riskLevel === "HIGH" ? "Activate contingency plan and weekly cash governance." : riskLevel === "MEDIUM" ? "Tighten monitoring and implement early mitigation actions." : "Maintain controls and monitor leading indicators monthly.";

  const explanation = [
    `Risk Level: ${riskLevel}`,
    `Estimated Score: ${score}`,
    `Key Drivers: ${drivers.join(", ")}`,
    `Recommended Action: ${action}`,
    "Source: Demo mode (local fallback when backend is unavailable).",
  ].join("\n");

  return { score, riskLevel, explanation };
}

export function chatDemo(message) {
  const prediction = predictRiskDemo(message);
  return [
    "Demo Copilot Response",
    `Based on your input, current risk is ${prediction.riskLevel} (${prediction.score}/100).`,
    "Top focus areas:",
    `- ${driversFromPrompt(message).join("\n- ")}`,
    "- Build 30-60-90 day mitigation plan with owner and due date.",
    "- Review triggers weekly and escalate if score rises above 70.",
    "This response is generated locally because backend is offline.",
  ].join("\n");
}
