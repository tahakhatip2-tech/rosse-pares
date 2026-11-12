"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Download,
  Maximize2,
  Minimize2,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import type {
  ExecutivePulse,
  PendingActionProposal,
  SecretaryChatResponse,
  SecretaryTable,
} from "@/lib/secretary-engine";
import type { QuickPrompt } from "@/lib/secretary-settings";

interface SecretaryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  kpis?: SecretaryChatResponse["kpis"];
  table?: SecretaryTable;
  links?: SecretaryChatResponse["links"];
  pendingAction?: PendingActionProposal;
  actionState?: "pending" | "executing" | "executed" | "cancelled";
  actionResultText?: string;
  usedGemini?: boolean;
}

interface BootstrapResponse {
  enabled: boolean;
  allowed: boolean;
  settings?: {
    displayName: string;
    subtitle: string;
    autoBriefingOnOpen?: boolean;
    allowCommands?: boolean;
    quickPrompts?: QuickPrompt[];
  };
  pulse?: ExecutivePulse;
}

const STORAGE_KEY = "rp_admin_secretary_chat_v1";

function downloadCsvTable(table: SecretaryTable) {
  const escapeCell = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
  const lines = [
    table.columns.map(escapeCell).join(","),
    ...table.rows.map((r) => r.map(escapeCell).join(",")),
  ];
  const csv = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rozeparees-report-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const TONE_CLASSES: Record<string, string> = {
  amber: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-300",
  emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  rose: "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300",
  sky: "bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300",
};

export function AdminSecretaryWidget({ userRole }: { userRole?: string | null }) {
  const [boot, setBoot] = useState<BootstrapResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<SecretaryMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const autoBriefTriggeredRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const loadBootstrap = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/secretary", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { success?: boolean; data?: BootstrapResponse };
      if (json.success && json.data) {
        setBoot(json.data);
      }
    } catch {
      // Keep widget hidden silently on network failure
    }
  }, []);

  useEffect(() => {
    loadBootstrap();
    const handler = () => {
      loadBootstrap();
    };
    window.addEventListener("rf-secretary-settings-updated", handler);
    return () => window.removeEventListener("rf-secretary-settings-updated", handler);
  }, [loadBootstrap]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SecretaryMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // Ignore storage error
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    } catch {
      // Ignore storage error
    }
  }, [messages, hydrated]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 60);
    return () => clearTimeout(t);
  }, [messages, isOpen, isLoading]);

  const sendQuery = useCallback(
    async (rawText: string) => {
      const trimmed = rawText.trim();
      if (!trimmed || isLoading) return;

      const userMsg: SecretaryMessage = {
        id: `adm-u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      const nextHistory = [...messages, userMsg];
      setMessages(nextHistory);
      setInput("");
      setIsLoading(true);

      try {
        const res = await fetch("/api/admin/secretary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: nextHistory.slice(-8).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });
        const json = (await res.json()) as {
          success?: boolean;
          data?: SecretaryChatResponse;
          error?: string;
        };
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error || "تعذر تحليل الطلب حالياً");
        }

        const data = json.data;
        const botMsg: SecretaryMessage = {
          id: `adm-b-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          kpis: data.kpis,
          table: data.table,
          links: data.links,
          pendingAction: data.pendingAction,
          actionState: data.pendingAction ? "pending" : undefined,
          actionResultText: data.executedNotice,
          usedGemini: data.usedGemini,
        };
        setMessages((prev) => [...prev, botMsg]);
        loadBootstrap();
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: `adm-err-${Date.now()}`,
            role: "assistant",
            content:
              e instanceof Error
                ? `تنبيه: ${e.message}`
                : "حدث خطأ مؤقت أثناء التواصل مع السكرتير.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, loadBootstrap]
  );

  // Welcome message or auto executive briefing on first open
  useEffect(() => {
    if (!isOpen || !hydrated || !boot?.allowed || !boot.enabled) return;

    if (messages.length === 0) {
      if (boot.settings?.autoBriefingOnOpen && !autoBriefTriggeredRef.current) {
        autoBriefTriggeredRef.current = true;
        sendQuery("أعطني الملخص التنفيذي الشامل لأداء شركة روز باريس اليوم والشهر");
      } else {
        setMessages([
          {
            id: "adm-welcome",
            role: "assistant",
            content: `مرحباً سعادة المدير! أنا "${boot.settings?.displayName ?? "سكرتير المدير الذكي"}". أستطيع تحليل المبيعات والمخزون والأرباح والمصاريف وتنفيذ أوامرك المباشرة بأمان تام.`,
          },
        ]);
      }
    }
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(focusTimer);
  }, [isOpen, hydrated, boot, messages.length, sendQuery]);

  async function handleConfirmAction(msgId: string, proposal: PendingActionProposal) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, actionState: "executing" } : m))
    );

    try {
      const res = await fetch("/api/admin/secretary/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { success: boolean; message: string };
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "تعذر تنفيذ الأمر");
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                actionState: "executed",
                actionResultText: json.data?.message,
              }
            : m
        )
      );
      loadBootstrap();
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                actionState: "pending",
                actionResultText: e instanceof Error ? e.message : "فشل التنفيذ",
              }
            : m
        )
      );
    }
  }

  function handleCancelAction(msgId: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              actionState: "cancelled",
              actionResultText: "تم إلغاء تنفيذ الأمر بناءً على طلبك.",
            }
          : m
      )
    );
  }

  function handleReset() {
    autoBriefTriggeredRef.current = false;
    setMessages([
      {
        id: `adm-welcome-${Date.now()}`,
        role: "assistant",
        content: `تم بدء جلسة جديدة. كيف يمكنني مساعدتك الآن؟`,
      },
    ]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  if (!boot || !boot.enabled || !boot.allowed) {
    return null;
  }

  const pulse = boot.pulse;
  const alertCount = (pulse?.pendingOrders ?? 0) + (pulse?.lowStockCount ?? 0);
  const canOpenSettings =
    userRole === "SUPER_ADMIN" || userRole === "BUSINESS_OWNER";
  const quickPrompts = boot.settings?.quickPrompts ?? [];

  return (
    <div dir="rtl" className="fixed bottom-5 left-5 z-40 flex flex-col items-start gap-3">
      {/* Executive Drawer */}
      {isOpen && (
        <section
          aria-label={boot.settings?.displayName ?? "سكرتير المدير الذكي"}
          className={`flex flex-col rounded-3xl overflow-hidden bg-[var(--color-bg-card)] border border-amber-500/40 shadow-2xl transition-all duration-200 max-h-[calc(100vh-7rem)] ${
            isExpanded
              ? "w-[calc(100vw-2.5rem)] sm:w-[680px] h-[640px]"
              : "w-[calc(100vw-2.5rem)] sm:w-[440px] h-[560px]"
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-l from-[#1c130b] via-[#2b1d10] to-amber-900 text-white px-4 py-3.5 flex items-center justify-between gap-2 shrink-0 border-b border-amber-500/30">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-extrabold truncate">
                    {boot.settings?.displayName ?? "سكرتير المدير الذكي"}
                  </h2>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                </div>
                <p className="text-[11px] text-amber-200/80 truncate">
                  {boot.settings?.subtitle ?? "تحليل البيانات وتنفيذ الأوامر"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {canOpenSettings && (
                <Link
                  href="/admin/secretary"
                  onClick={() => setIsOpen(false)}
                  title="لوحة إعدادات السكرتير"
                  className="p-2 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                title={isExpanded ? "تصغير النافذة" : "توسيع النافذة"}
                className="hidden sm:inline-flex p-2 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="بدء جلسة جديدة"
                className="p-2 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="إغلاق السكرتير"
                className="p-2 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live Executive Pulse Bar */}
          {pulse && (
            <div className="px-3.5 py-2 bg-[var(--color-bg-muted)] border-b border-[var(--color-border)] grid grid-cols-3 gap-2 text-center shrink-0">
              <div className="px-2 py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                <p className="text-[10px] text-[var(--color-text-muted)]">مبيعات اليوم</p>
                <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(pulse.todayRevenue)}
                </p>
              </div>
              <div className="px-2 py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                <p className="text-[10px] text-[var(--color-text-muted)]">طلبات معلقة</p>
                <p
                  className={`text-xs font-extrabold ${
                    pulse.pendingOrders > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"
                  }`}
                >
                  {pulse.pendingOrders}
                </p>
              </div>
              <div className="px-2 py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                <p className="text-[10px] text-[var(--color-text-muted)]">نواقص المخزون</p>
                <p
                  className={`text-xs font-extrabold ${
                    pulse.lowStockCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"
                  }`}
                >
                  {pulse.lowStockCount}
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3.5 bg-[var(--color-bg)]"
          >
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-start" : "items-end"} gap-2`}
                >
                  <div
                    className={`max-w-[94%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? "bg-amber-600 text-white rounded-tr-sm"
                        : "bg-[var(--color-bg-card)] text-[var(--color-text)] border border-[var(--color-border)] rounded-tl-sm"
                    }`}
                  >
                    {msg.usedGemini && !isUser && (
                      <div className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300">
                        <Sparkles className="w-3 h-3" />
                        <span>تحليل AI متقدم</span>
                      </div>
                    )}

                    <p className="whitespace-pre-line">{msg.content}</p>

                    {/* KPIs Grid */}
                    {msg.kpis && msg.kpis.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {msg.kpis.map((kpi, i) => (
                          <div
                            key={i}
                            className={`p-2.5 rounded-xl border ${
                              TONE_CLASSES[kpi.tone ?? "amber"]
                            }`}
                          >
                            <p className="text-[11px] opacity-80">{kpi.label}</p>
                            <p className="text-sm font-extrabold mt-0.5">{kpi.value}</p>
                            {kpi.hint && (
                              <p className="text-[10px] opacity-75 mt-0.5">{kpi.hint}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Structured Table + CSV Export */}
                    {msg.table && msg.table.rows.length > 0 && (
                      <div className="mt-3 rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg)]">
                        <div className="px-3 py-2 bg-[var(--color-bg-muted)] flex items-center justify-between gap-2 border-b border-[var(--color-border)]">
                          <span className="text-xs font-bold">{msg.table.title}</span>
                          <button
                            type="button"
                            onClick={() => msg.table && downloadCsvTable(msg.table)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                          >
                            <Download className="w-3 h-3" />
                            <span>CSV</span>
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px] text-right">
                            <thead className="bg-[var(--color-bg-muted)]/60 text-[var(--color-text-muted)]">
                              <tr>
                                {msg.table.columns.map((col, idx) => (
                                  <th key={idx} className="px-2.5 py-1.5 font-bold whitespace-nowrap">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                              {msg.table.rows.map((row, rIdx) => (
                                <tr key={rIdx}>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-2.5 py-1.5 whitespace-nowrap">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Action Proposal Card */}
                    {msg.pendingAction && (
                      <div
                        className={`mt-3 p-3 rounded-xl border ${
                          msg.pendingAction.severity === "warning"
                            ? "border-rose-500/40 bg-rose-500/5"
                            : "border-amber-500/40 bg-amber-500/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold">
                            {msg.pendingAction.severity === "warning" ? (
                              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                            ) : (
                              <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                            )}
                            <span>{msg.pendingAction.title}</span>
                          </div>
                        </div>

                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          {msg.pendingAction.summary}
                        </p>

                        <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] bg-[var(--color-bg)] p-2 rounded-lg border border-[var(--color-border)]">
                          <div>
                            <span className="text-[var(--color-text-muted)] block">قبل:</span>
                            <span className="font-bold">{msg.pendingAction.oldValueLabel}</span>
                          </div>
                          <div>
                            <span className="text-[var(--color-text-muted)] block">بعد:</span>
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                              {msg.pendingAction.newValueLabel}
                            </span>
                          </div>
                        </div>

                        {msg.actionState === "pending" && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                msg.pendingAction &&
                                handleConfirmAction(msg.id, msg.pendingAction)
                              }
                              className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                            >
                              تأكيد وتنفيذ الآن
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelAction(msg.id)}
                              className="py-2 px-3 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg-muted)] text-xs font-bold transition"
                            >
                              إلغاء
                            </button>
                          </div>
                        )}

                        {msg.actionState === "executing" && (
                          <p className="mt-2.5 text-xs font-bold text-amber-600">
                            جاري تنفيذ الأمر وتوثيقه في سجل التدقيق...
                          </p>
                        )}

                        {msg.actionResultText && msg.actionState !== "executing" && (
                          <div
                            className={`mt-2.5 flex items-center gap-1.5 text-xs font-bold ${
                              msg.actionState === "executed"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-[var(--color-text-muted)]"
                            }`}
                          >
                            {msg.actionState === "executed" && (
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                            )}
                            <span>{msg.actionResultText}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Executed Notice (when requireConfirmation=false) */}
                    {!msg.pendingAction && msg.actionResultText && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{msg.actionResultText}</span>
                      </div>
                    )}

                    {/* Navigation Links */}
                    {msg.links && msg.links.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {msg.links.map((lk) => (
                          <Link
                            key={lk.href}
                            href={lk.href}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition"
                          >
                            <span>{lk.label}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-end">
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.1s]" />
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts Bar */}
          {quickPrompts.length > 0 && (
            <div className="px-3 py-2 bg-[var(--color-bg-muted)]/70 border-t border-[var(--color-border)] flex gap-1.5 overflow-x-auto shrink-0">
              {quickPrompts.map((qp) => (
                <button
                  key={qp.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => sendQuery(qp.prompt)}
                  className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-amber-500/60 hover:text-amber-600 transition"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendQuery(input);
            }}
            className="p-3 bg-[var(--color-bg-card)] border-t border-[var(--color-border)] flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                boot.settings?.allowCommands
                  ? "اطلب تقريراً أو أعطِ أمراً (مثلاً: زد مخزون جبس بورد 20)..."
                  : "اسأل عن المبيعات، المخزون، الأرباح أو الفروع..."
              }
              disabled={isLoading}
              className="flex-1 text-sm px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="إرسال"
              className="w-10 h-10 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-45 text-white flex items-center justify-center transition shrink-0"
            >
              <Send className="w-4 h-4 rotate-180" />
            </button>
          </form>
        </section>
      )}

      {/* Floating Secretary Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((v) => !v);
          loadBootstrap();
        }}
        aria-expanded={isOpen}
        className="group relative flex items-center gap-2.5 px-4 h-12 rounded-full bg-gradient-to-br from-[#1c130b] via-[#2b1d10] to-amber-800 hover:from-[#261a0f] hover:to-amber-700 text-white border border-amber-400/50 shadow-xl shadow-black/30 transition-all duration-200 hover:scale-105 active:scale-95"
      >
        <div className="relative flex items-center justify-center">
          {isOpen ? <X className="w-5 h-5 text-amber-200" /> : <Bot className="w-5 h-5 text-amber-300" />}
          {!isOpen && alertCount > 0 && (
            <span className="absolute -top-2.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-[#1c130b]">
              {alertCount > 99 ? "99+" : alertCount}
            </span>
          )}
        </div>
        <span className="text-xs font-extrabold tracking-wide">
          {isOpen ? "إغلاق السكرتير" : boot.settings?.displayName ?? "سكرتير المدير"}
        </span>
      </button>
    </div>
  );
}
