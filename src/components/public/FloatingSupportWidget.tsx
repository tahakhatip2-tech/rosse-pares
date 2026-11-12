"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/currency";
import type { ChatProductSuggestion } from "@/app/api/chat/route";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: ChatProductSuggestion[];
  quickReplies?: string[];
  showWhatsAppHandoff?: boolean;
}

const WHATSAPP_NUMBER = "962770585313";
const WHATSAPP_DISPLAY = "0770585313";
const STORAGE_KEY = "rp_support_chat_v1";

const HIDDEN_PREFIXES = ["/admin", "/pos", "/login", "/register", "/unauthorized"];

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "أهلاً بك في روز باريس لمواد البناء والديكور! 🏗️ كيف يمكنني مساعدتك اليوم؟ يمكنك سؤالي عن الدهانات، الجبس بورد، بديل الخشب والرخام، مواد العزل، الأسعار، أو توريد المقاولين والمشاريع.",
  quickReplies: [
    "ما هي المواد والمنتجات المميزة؟",
    "أين يقع معرضكم وساعات العمل؟",
    "هل يوجد توصيل أو أسعار مقاولين؟",
    "تحدث مع خدمة العملاء واتساب",
  ],
};

function buildWhatsAppUrl(pathname: string): string {
  const baseText = pathname.startsWith("/products/")
    ? `مرحباً روز باريس لمواد البناء والديكور، لدي استفسار بخصوص هذا المنتج: (${pathname})`
    : "مرحباً روز باريس لمواد البناء والديكور، أرغب بالاستفسار عن مواد البناء والديكور والأسعار.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(baseText)}`;
}

export default function FloatingSupportWidget() {
  const pathname = usePathname() || "/";
  const addItem = useCartStore((s) => s.addItem);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isHiddenRoute = HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  // Hydrate conversation history safely on client
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // Ignore storage errors
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-24)));
    } catch {
      // Ignore storage errors
    }
  }, [messages, hydrated]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [messages, isOpen, isLoading]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (isHiddenRoute) return null;

  const whatsappUrl = buildWhatsAppUrl(pathname);

  async function sendMessage(rawText: string) {
    const trimmed = rawText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          currentPath: pathname,
          history: nextHistory.slice(-8).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        data?: {
          reply: string;
          products?: ChatProductSuggestion[];
          quickReplies?: string[];
          showWhatsAppHandoff?: boolean;
        };
        error?: string;
      };

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "تعذر الرد مؤقتاً");
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: json.data.reply,
        products: json.data.products,
        quickReplies: json.data.quickReplies,
        showWhatsAppHandoff: json.data.showWhatsAppHandoff,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            "عذراً، حدث بطء مؤقت في الاتصال. يمكنك المحاولة مرة أخرى أو مراسلتنا مباشرة على الواتساب للرد الفوري.",
          showWhatsAppHandoff: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setMessages([INITIAL_ASSISTANT_MESSAGE]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  function handleQuickAdd(p: ChatProductSuggestion) {
    addItem({
      id: p.id,
      productId: p.id,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      price: p.price,
      qty: 1,
      image: p.image,
      unit: p.unit,
    });
    setAddedId(p.id);
    setTimeout(() => {
      setAddedId((curr) => (curr === p.id ? null : curr));
    }, 1500);
  }

  return (
    <div dir="rtl" className="fixed bottom-24 left-4 md:bottom-6 md:left-6 z-40 flex flex-col items-start gap-3">
      {/* Floating Smart Chat Drawer */}
      {isOpen && (
        <section
          aria-label="المساعد الذكي لروز باريس لمواد البناء والديكور"
          className="w-[calc(100vw-2rem)] sm:w-[390px] h-[520px] max-h-[calc(100vh-13rem)] md:max-h-[calc(100vh-8.5rem)] rounded-3xl overflow-hidden bg-cream-50 dark:bg-stone-900 border border-amber-200/80 dark:border-stone-700 shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-l from-amber-600 via-amber-700 to-stone-900 text-white px-4 py-3.5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-full bg-cream-50 p-1 shrink-0 ring-2 ring-amber-300/60 overflow-hidden">
                <img
                  src="/rozeparees.png"
                  alt="روز باريس"
                  className="w-full h-full object-contain"
                />
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-amber-700"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold truncate">مساعد روز باريس</h2>
                <p className="text-[11px] text-amber-100/90 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  متصل الآن • استشاري مواد البناء
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`واتساب مباشر ${WHATSAPP_DISPLAY}`}
                className="p-2 rounded-full hover:bg-white/15 transition-colors text-emerald-200 hover:text-white"
              >
                <WhatsAppIcon className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={handleReset}
                title="بدء محادثة جديدة"
                className="p-2 rounded-full hover:bg-white/15 transition-colors text-amber-100 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="إغلاق المحادثة"
                className="p-2 rounded-full hover:bg-white/15 transition-colors text-amber-100 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3.5 bg-[#fcf8f0] dark:bg-stone-950/60"
          >
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const isLatestBot = !isUser && idx === messages.length - 1;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-start" : "items-end"} gap-2`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                      isUser
                        ? "bg-amber-600 text-white rounded-tr-sm"
                        : "bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 border border-amber-100 dark:border-stone-700 rounded-tl-sm"
                    }`}
                  >
                    {msg.content}

                    {/* Suggested Product Mini-Cards */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.products.map((prod) => (
                          <div
                            key={prod.id}
                            className="flex items-center gap-2.5 p-2 rounded-xl bg-cream-50 dark:bg-stone-900/90 border border-amber-200/70 dark:border-stone-700"
                          >
                            <Link
                              href={`/products/${prod.id}`}
                              onClick={() => setIsOpen(false)}
                              className="w-12 h-12 rounded-lg overflow-hidden bg-[#f7efe1] dark:bg-stone-800 shrink-0 border border-amber-100 dark:border-stone-700"
                            >
                              <img
                                src={prod.image || "/rozeparees.png"}
                                alt={prod.nameAr}
                                className="w-full h-full object-cover"
                              />
                            </Link>
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/products/${prod.id}`}
                                onClick={() => setIsOpen(false)}
                                className="block text-xs font-bold text-stone-900 dark:text-stone-100 hover:text-amber-600 truncate"
                              >
                                {prod.nameAr}
                              </Link>
                              <p className="text-[11px] font-extrabold text-amber-700 dark:text-amber-400">
                                {formatCurrency(prod.price)}
                                <span className="font-normal text-stone-400 mr-1">/ {prod.unit}</span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleQuickAdd(prod)}
                              className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                                addedId === prod.id
                                  ? "bg-emerald-600 text-white"
                                  : "bg-amber-600 hover:bg-amber-700 text-white"
                              }`}
                            >
                              {addedId === prod.id ? "✓ أُضيف" : "+ للسلة"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* WhatsApp Direct Handoff CTA */}
                    {msg.showWhatsAppHandoff && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-bold shadow-sm transition-colors"
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                        <span>تواصل مباشرة واتساب ({WHATSAPP_DISPLAY})</span>
                      </a>
                    )}
                  </div>

                  {/* Quick Replies under latest assistant reply */}
                  {isLatestBot && msg.quickReplies && msg.quickReplies.length > 0 && !isLoading && (
                    <div className="flex flex-wrap justify-end gap-1.5 max-w-[95%]">
                      {msg.quickReplies.map((qr) => (
                        <button
                          key={qr}
                          type="button"
                          onClick={() => sendMessage(qr)}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-100/80 dark:bg-stone-800 text-amber-900 dark:text-amber-300 border border-amber-300/60 dark:border-stone-700 hover:bg-amber-200/80 dark:hover:bg-stone-700 transition-colors"
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-end">
                <div className="bg-white dark:bg-stone-800 border border-amber-100 dark:border-stone-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.1s]" />
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="p-3 bg-white dark:bg-stone-900 border-t border-amber-100 dark:border-stone-800 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اسأل عن الدهانات، الجبس بورد، بديل الرخام، العزل..."
              disabled={isLoading}
              className="flex-1 text-sm px-3.5 py-2.5 rounded-xl bg-cream-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 border border-amber-200/70 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="إرسال الرسالة"
              className="w-10 h-10 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-45 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0 shadow-sm"
            >
              <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </section>
      )}

      {/* Two Fixed Floating Action Buttons */}
      <div className="flex flex-col items-start gap-2.5">
        {/* Button 1: Smart Chat Assistant */}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-label={isOpen ? "إغلاق المساعد الذكي" : "فتح المساعد الذكي"}
          className="group relative flex items-center gap-2.5 pl-3.5 pr-3.5 sm:pl-4 h-12 sm:h-13 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white shadow-lg shadow-amber-900/25 ring-2 ring-white/80 dark:ring-stone-900 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <span className="relative flex items-center justify-center w-6 h-6">
            {isOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            )}
            {!isOpen && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-amber-600"
              />
            )}
          </span>
          <span className="hidden sm:inline text-xs font-extrabold tracking-wide">
            {isOpen ? "إغلاق الشات" : "اسأل المساعد"}
          </span>
        </button>

        {/* Button 2: Direct WhatsApp (0770585313) */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`تواصل عبر واتساب ${WHATSAPP_DISPLAY}`}
          title={`تواصل عبر واتساب ${WHATSAPP_DISPLAY}`}
          className="group flex items-center gap-2.5 pl-3.5 pr-3.5 sm:pl-4 h-12 sm:h-13 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] hover:from-[#20bd5a] hover:to-[#0f766a] text-white shadow-lg shadow-emerald-950/25 ring-2 ring-white/80 dark:ring-stone-900 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <WhatsAppIcon className="w-6 h-6 shrink-0" />
          <span className="hidden sm:inline text-xs font-extrabold tracking-wide">
            واتساب مباشر
          </span>
        </a>
      </div>
    </div>
  );
}

function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.01 2.67C8.65 2.67 2.67 8.65 2.67 16c0 2.35.61 4.64 1.78 6.67L2.56 29.5l7.01-1.84a13.28 13.28 0 006.44 1.66h.01c7.36 0 13.34-5.98 13.34-13.33 0-3.56-1.39-6.91-3.91-9.43a13.24 13.24 0 00-9.44-3.89zm0 24.4c-1.99 0-3.94-.53-5.64-1.54l-.4-.24-4.16 1.09 1.11-4.05-.26-.42a10.97 10.97 0 01-1.69-5.9c0-6.1 4.97-11.07 11.08-11.07 2.96 0 5.74 1.15 7.83 3.24a11 11 0 013.24 7.83c0 6.1-4.97 11.06-11.11 11.06zm6.07-8.29c-.33-.17-1.97-.97-2.27-1.08-.31-.11-.53-.17-.75.17-.22.33-.86 1.08-1.05 1.3-.19.22-.39.25-.72.08-.33-.17-1.4-.52-2.67-1.65-.99-.88-1.66-1.97-1.85-2.3-.19-.33-.02-.51.14-.68.15-.15.33-.39.5-.58.17-.19.22-.33.33-.55.11-.22.06-.42-.03-.58-.08-.17-.75-1.8-.99-2.47-.26-.64-.53-.55-.75-.56h-.64c-.22 0-.58.08-.89.42-.31.33-1.17 1.14-1.17 2.78 0 1.64 1.19 3.22 1.36 3.44.17.22 2.35 3.59 5.69 5.03.8.34 1.42.55 1.9.7.8.25 1.53.22 2.1.13.64-.1 1.97-.8 2.25-1.58.28-.78.28-1.44.19-1.58-.08-.14-.3-.22-.63-.39z" />
    </svg>
  );
}

