import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { extractApiError, shouldFallbackToDemo } from "../lib/api";
import { clearToken } from "../lib/auth";
import { chatDemo, predictRiskDemo } from "../lib/demoEngine";

const HISTORY_KEY = "innvofest_prediction_history_v1";
const quickPrompts = [
  "Predict bankruptcy risk due to heavy debt and low revenue.",
  "Assess project delay risk from supplier disruption and cash burn.",
  "Evaluate operational risk for expansion into two new cities next quarter.",
  "Analyze fraud and compliance risk in high-volume vendor payments.",
];

function getRiskBand(score) {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

function inferRiskScore(text) {
  const lower = text.toLowerCase();

  if (lower.includes("critical") || lower.includes("severe")) return 88;
  if (lower.includes("high")) return 78;
  if (lower.includes("medium") || lower.includes("moderate")) return 56;
  if (lower.includes("low")) return 26;

  let score = 50;
  if (lower.includes("debt")) score += 10;
  if (lower.includes("delay")) score += 7;
  if (lower.includes("cash flow") || lower.includes("burn")) score += 8;
  if (lower.includes("compliance") || lower.includes("fraud")) score += 12;
  if (lower.includes("strong") || lower.includes("stable")) score -= 10;

  return Math.max(5, Math.min(95, score));
}

function pickRiskDrivers(text) {
  const lower = text.toLowerCase();
  const map = [
    ["Debt pressure", ["debt", "leverage", "liability"]],
    ["Cash flow stress", ["cash", "burn", "liquidity"]],
    ["Delivery timeline risk", ["delay", "deadline", "schedule"]],
    ["Compliance exposure", ["compliance", "regulatory", "fraud"]],
    ["Market uncertainty", ["market", "demand", "competition"]],
  ];

  const matched = map
    .filter((entry) => entry[1].some((token) => lower.includes(token)))
    .map((entry) => entry[0]);

  return matched.length ? matched : ["Baseline operational uncertainty"];
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(records) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, 12)));
}

function buildPossibleSolutions({ risk, riskScore, riskDrivers, result }) {
  const catalog = {
    "Debt pressure": {
      action: "Refinance expensive debt and freeze new non-critical borrowing.",
      owner: "Finance Lead",
      timeline: "7-14 days",
    },
    "Cash flow stress": {
      action: "Run 13-week cash forecast and cut low-ROI spend immediately.",
      owner: "CFO Office",
      timeline: "48 hours",
    },
    "Delivery timeline risk": {
      action: "Re-baseline milestones and secure backup suppliers for critical path items.",
      owner: "Operations Head",
      timeline: "5-10 days",
    },
    "Compliance exposure": {
      action: "Launch compliance audit and enforce approval workflow for sensitive transactions.",
      owner: "Compliance Officer",
      timeline: "3-7 days",
    },
    "Market uncertainty": {
      action: "Create downside demand scenario and shift budget to resilient channels.",
      owner: "Strategy Team",
      timeline: "7 days",
    },
    "Baseline operational uncertainty": {
      action: "Set weekly risk review with quantified KPIs and escalation triggers.",
      owner: "PMO",
      timeline: "Immediate",
    },
  };

  const priority = risk === "HIGH" || riskScore >= 70 ? "Critical" : risk === "MEDIUM" ? "High" : "Moderate";
  const base = (riskDrivers || []).map((driver) => {
    const mapped = catalog[driver] || catalog["Baseline operational uncertainty"];
    return {
      driver,
      priority,
      ...mapped,
    };
  });

  if (result && /fraud|compliance|regulatory/i.test(result)) {
    base.push({
      driver: "Control monitoring",
      action: "Enable anomaly alerts and dual-approval checks for high-value transactions.",
      owner: "Risk Control Team",
      timeline: "72 hours",
      priority: "Critical",
    });
  }

  return base.slice(0, 6);
}

function Dashboard() {
  const [userName, setUserName] = useState("Manager");
  const [serviceState, setServiceState] = useState({
    aiModel: "-",
    alertsEnabled: false,
    backendOnline: true,
  });
  const [risk, setRisk] = useState("MEDIUM");
  const [riskScore, setRiskScore] = useState(50);
  const [trend, setTrend] = useState([28, 34, 41, 48, 44, 52, 58]);
  const [result, setResult] = useState("");
  const [message, setMessage] = useState("Analyze financial risk for this month with key drivers and actions.");
  const [chatInput, setChatInput] = useState("");
  const [chatReply, setChatReply] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatError, setChatError] = useState("");
  const [alertStatus, setAlertStatus] = useState("");
  const [alertError, setAlertError] = useState("");
  const [history, setHistory] = useState(loadHistory);
  const [insightTab, setInsightTab] = useState("feed");
  const navigate = useNavigate();

  useEffect(() => {
    const checkToken = localStorage.getItem("token");

    if (!checkToken) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [meRes, healthRes] = await Promise.all([api.get("/me"), api.get("/health")]);
        setUserName(meRes.data?.name || "Manager");
        setServiceState({
          aiModel: healthRes.data?.aiModel || "gpt-4o-mini",
          alertsEnabled: Boolean(healthRes.data?.alertsEnabled),
          backendOnline: true,
        });
      } catch {
        setServiceState({
          aiModel: "Demo local engine",
          alertsEnabled: false,
          backendOnline: false,
        });
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const riskDrivers = useMemo(() => pickRiskDrivers(result), [result]);
  const possibleSolutions = useMemo(
    () => buildPossibleSolutions({ risk, riskScore, riskDrivers, result }),
    [risk, riskScore, riskDrivers, result]
  );

  const chartPoints = trend.map((value, index) => `${index * 52},${120 - value}`).join(" ");
  const confidence = Math.max(35, 100 - Math.abs(50 - riskScore));

  const handlePredict = async () => {
    try {
      setLoading(true);
      setError("");
      setAlertStatus("");
      setAlertError("");

      const res = await api.post("/predict", { message });

      const explanation = res.data.result || "No explanation returned.";
      const nextScore = inferRiskScore(explanation);
      const nextRisk = getRiskBand(nextScore);
      const now = new Date().toISOString();

      setResult(explanation);
      setRisk(nextRisk);
      setRiskScore(nextScore);
      setTrend((previous) => [...previous.slice(-6), nextScore]);
      setHistory((prev) => [
        {
          id: now,
          prompt: message,
          score: nextScore,
          riskLevel: nextRisk,
          summary: explanation.slice(0, 120),
          timestamp: now,
        },
        ...prev,
      ]);

      try {
        const alertRes = await api.post("/alerts/evaluate-email", {
          riskScore: nextScore,
          riskLevel: nextRisk,
          explanation,
        });

        if (alertRes.data?.sent) {
          setAlertStatus("Alert triggered and email sent.");
        } else {
          setAlertStatus(alertRes.data?.reason || "No email alert triggered.");
        }
      } catch (alertApiError) {
        setAlertError(extractApiError(alertApiError, "Alert evaluation failed."));
      }
    } catch (apiError) {
      if (shouldFallbackToDemo(apiError)) {
        const networkDown = !apiError?.response;
        const demo = predictRiskDemo(message);
        const now = new Date().toISOString();

        setRisk(demo.riskLevel);
        setRiskScore(demo.score);
        setTrend((previous) => [...previous.slice(-6), demo.score]);
        setResult(demo.explanation);
        setHistory((prev) => [
          {
            id: now,
            prompt: message,
            score: demo.score,
            riskLevel: demo.riskLevel,
            summary: demo.explanation.slice(0, 120),
            timestamp: now,
          },
          ...prev,
        ]);
        setServiceState((prev) => ({ ...prev, backendOnline: !networkDown, aiModel: "Demo local engine" }));
        setAlertStatus(
          networkDown
            ? "Backend offline: switched to free local demo mode. Email alert requires backend SMTP."
            : "Cloud AI unavailable/quota exceeded: switched to free local demo mode. Email alert requires backend SMTP."
        );
      } else {
        setError(extractApiError(apiError, "Prediction failed. Try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) {
      setChatError("Enter a message for AI chat.");
      return;
    }

    try {
      setChatLoading(true);
      setChatError("");
      const res = await api.post("/chat", { message: chatInput });
      const reply = res.data.reply || "No response returned.";
      setChatReply(reply);
      setChatLog((prev) => [{ q: chatInput, a: reply, t: Date.now() }, ...prev].slice(0, 5));
      setChatInput("");
    } catch (apiError) {
      if (shouldFallbackToDemo(apiError)) {
        const networkDown = !apiError?.response;
        const reply = chatDemo(chatInput);
        setChatReply(reply);
        setChatLog((prev) => [{ q: chatInput, a: reply, t: Date.now() }, ...prev].slice(0, 5));
        setChatInput("");
        setServiceState((prev) => ({ ...prev, backendOnline: !networkDown, aiModel: "Demo local engine" }));
        setChatError(
          networkDown
            ? "Backend offline. Using free local demo response."
            : "Cloud AI unavailable/quota exceeded. Using free local demo response."
        );
      } else {
        setChatError(extractApiError(apiError, "Chat request failed. Try again."));
      }
    } finally {
      setChatLoading(false);
    }
  };

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `innvofest-risk-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reusePrompt = (prompt) => setMessage(prompt);

  const handleLogout = () => {
    clearToken();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-6xl rounded-3xl border border-white/25 bg-white/90 p-6 shadow-2xl backdrop-blur md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">InnoVest Command Center</p>
            <h1 className="text-3xl font-black text-slate-900">Welcome, {userName}</h1>
            <p className="text-sm text-slate-600">
              AI model: <span className="font-semibold text-slate-800">{serviceState.aiModel}</span> | Alerts:{" "}
              <span className={serviceState.alertsEnabled ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
                {serviceState.alertsEnabled ? "SMTP Enabled" : "SMTP Not Configured"}
              </span>
            </p>
            {!serviceState.backendOnline ? (
              <p className="text-xs font-semibold text-amber-600">
                Backend offline. Using free local demo mode.
              </p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              onClick={exportHistory}
            >
              Export History
            </button>
            <button
              className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              onClick={() => setHistory([])}
            >
              Clear History
            </button>
            <button
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              onClick={() => reusePrompt(prompt)}
            >
              {prompt.slice(0, 46)}...
            </button>
          ))}
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">Risk Score</p>
            <p className="text-3xl font-black text-slate-900">{riskScore}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">Risk Level</p>
            <p className="text-3xl font-black text-red-600">{risk}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">AI Confidence</p>
            <p className="text-3xl font-black text-slate-900">{confidence}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">Predictions Logged</p>
            <p className="text-3xl font-black text-slate-900">{history.length}</p>
          </div>
        </div>

        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">Risk Meter</h3>
            <div className="mt-5 flex items-center gap-6">
              <div
                className="grid h-32 w-32 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#ef4444 ${riskScore}%, #e2e8f0 ${riskScore}% 100%)`,
                }}
              >
                <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-inner">
                  <p className="text-xl font-bold text-slate-900">{riskScore}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Score</p>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-slate-500">Current level</p>
                <p className="text-3xl font-bold text-slate-900">{risk}</p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500"
                    style={{ width: `${riskScore}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">7-Cycle Trend</h3>
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
              <svg className="h-32 w-full" viewBox="0 0 312 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="riskLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
                <polyline points={chartPoints} fill="none" stroke="url(#riskLine)" strokeWidth="4" strokeLinecap="round" />
              </svg>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                {trend.map((value, idx) => (
                  <span key={`${value}-${idx}`}>{value}</span>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 lg:col-span-1">
            <h3 className="text-lg font-semibold text-slate-800">AI Risk Prediction</h3>
            <textarea
              className="mt-3 min-h-40 w-full rounded border border-slate-300 p-3 outline-none focus:border-indigo-500"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />

            <button
              className="mt-3 w-full rounded bg-red-500 px-4 py-2 font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
              onClick={handlePredict}
            >
              {loading ? "Predicting..." : "Predict Risk"}
            </button>

            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            {alertStatus ? <p className="mt-2 text-sm text-emerald-700">{alertStatus}</p> : null}
            {alertError ? <p className="mt-2 text-sm text-amber-700">{alertError}</p> : null}

            <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Top Drivers</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {riskDrivers.map((driver) => (
                <span key={driver} className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                  {driver}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 lg:col-span-1">
            <h3 className="text-lg font-semibold text-slate-800">AI Chat Copilot</h3>
            <textarea
              className="mt-3 min-h-32 w-full rounded border border-slate-300 p-3 outline-none focus:border-indigo-500"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ask follow-up like: suggest mitigation plan for this risk"
            />

            <button
              className="mt-3 w-full rounded bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={chatLoading}
              onClick={handleChat}
            >
              {chatLoading ? "Asking..." : "Send to AI"}
            </button>

            {chatError ? <p className="mt-3 text-sm text-red-600">{chatError}</p> : null}

            <div className="mt-4 rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
              {chatReply || "AI reply will appear here."}
            </div>

            {chatLog.length ? (
              <div className="mt-3 space-y-2">
                {chatLog.slice(0, 2).map((entry) => (
                  <div key={entry.t} className="rounded border border-slate-200 bg-white p-2">
                    <p className="text-xs font-semibold text-slate-500">Q: {entry.q}</p>
                    <p className="text-xs text-slate-700">A: {entry.a.slice(0, 120)}...</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 lg:col-span-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-800">Insights</h3>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                <button
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    insightTab === "feed" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                  onClick={() => setInsightTab("feed")}
                >
                  Decision Feed
                </button>
                <button
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    insightTab === "solutions" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                  onClick={() => setInsightTab("solutions")}
                >
                  Possible Solutions
                </button>
              </div>
            </div>

            {insightTab === "feed" ? (
              <>
                <p className="mt-1 text-sm text-slate-600">Latest prediction output and historical snapshots.</p>
                <div className="mt-3 rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  {result || "Run prediction to see full AI explanation and recommendations."}
                </div>
                <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
                  {history.length ? (
                    history.map((item) => (
                      <button
                        key={item.id}
                        className="w-full rounded border border-slate-200 bg-white p-2 text-left hover:border-indigo-300"
                        onClick={() => reusePrompt(item.prompt)}
                      >
                        <p className="text-xs font-semibold text-slate-700">
                          {item.riskLevel} | Score {item.score}
                        </p>
                        <p className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</p>
                        <p className="mt-1 text-xs text-slate-600">{item.summary}</p>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No history yet.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-600">Actionable mitigation plan generated from current risk signal.</p>
                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {possibleSolutions.map((item, idx) => (
                    <div key={`${item.driver}-${idx}`} className="rounded border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-800">{item.driver}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            item.priority === "Critical"
                              ? "bg-rose-100 text-rose-700"
                              : item.priority === "High"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {item.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-700">{item.action}</p>
                      <p className="mt-2 text-[11px] text-slate-500">
                        Owner: <span className="font-semibold text-slate-600">{item.owner}</span> | Target:{" "}
                        <span className="font-semibold text-slate-600">{item.timeline}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
