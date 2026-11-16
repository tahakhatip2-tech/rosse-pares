"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Fingerprint,
  LogIn,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  User,
  Building2,
  Delete,
  Lock,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  AlertCircle,
  UserPlus,
  ArrowRight,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type KioskView =
  | "LOGIN"
  | "BADGE"
  | "ACTION"
  | "FINGERPRINT"
  | "RESULT"
  | "ENROLL_BADGE"
  | "ENROLL_CONFIRM"
  | "ENROLL_SCAN"
  | "ENROLL_DONE";

type PunchAction = "CLOCK_IN" | "CLOCK_OUT";
type ResultType = "SUCCESS" | "ERROR";

interface BusinessInfo {
  id: string;
  nameAr: string;
  logo?: string | null;
}

interface FoundEmployee {
  id: string;
  nameAr: string;
  fingerprintEnrolled: boolean;
  jobTitle?: string | null;
}

interface PunchResult {
  type: ResultType;
  message: string;
  employeeName?: string;
  action?: PunchAction;
  time?: string;
  branch?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ar-JO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ar-JO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const KIOSK_TOKEN_KEY = "kiosk_token";
const KIOSK_BUSINESS_KEY = "kiosk_business";

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function KioskPage() {
  const [view, setView] = useState<KioskView>("LOGIN");
  const [kioskToken, setKioskToken] = useState<string | null>(null);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Attendance badge + action state
  const [badgeInput, setBadgeInput] = useState("");
  const [badgeLoading, setBadgeLoading] = useState(false);
  const [badgeError, setBadgeError] = useState("");
  const [foundEmployee, setFoundEmployee] = useState<FoundEmployee | null>(null);
  const [selectedAction, setSelectedAction] = useState<PunchAction | null>(null);
  const [fingerprintLoading, setFingerprintLoading] = useState(false);
  const [fingerprintError, setFingerprintError] = useState("");
  const [webAuthnSupported, setWebAuthnSupported] = useState<boolean | null>(null);

  // Result state
  const [result, setResult] = useState<PunchResult | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enrollment state
  const [enrollBadge, setEnrollBadge] = useState("");
  const [enrollBadgeLoading, setEnrollBadgeLoading] = useState(false);
  const [enrollBadgeError, setEnrollBadgeError] = useState("");
  const [enrollEmployee, setEnrollEmployee] = useState<FoundEmployee | null>(null);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  // Active numpad target: "attendance" | "enroll"
  const [numpadTarget, setNumpadTarget] = useState<"attendance" | "enroll">("attendance");
  // Keypad mode: numbers or English letters
  const [keypadMode, setKeypadMode] = useState<"NUM" | "ABC">("NUM");

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check WebAuthn support
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      !!window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function";
    if (supported) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(setWebAuthnSupported)
        .catch(() => setWebAuthnSupported(false));
    } else {
      setWebAuthnSupported(false);
    }
  }, []);

  // Restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem(KIOSK_TOKEN_KEY);
    const savedBusiness = localStorage.getItem(KIOSK_BUSINESS_KEY);
    if (savedToken && savedBusiness) {
      try {
        const biz = JSON.parse(savedBusiness) as BusinessInfo;
        setKioskToken(savedToken);
        setBusiness(biz);
        setView("BADGE");
      } catch {
        localStorage.removeItem(KIOSK_TOKEN_KEY);
        localStorage.removeItem(KIOSK_BUSINESS_KEY);
      }
    }
  }, []);

  // Auto-clear result after 4s
  useEffect(() => {
    if (view === "RESULT") {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      resultTimerRef.current = setTimeout(() => resetAttendance(), 4000);
    }
    return () => {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, [view]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const resetAttendance = () => {
    setBadgeInput("");
    setBadgeError("");
    setFoundEmployee(null);
    setSelectedAction(null);
    setFingerprintError("");
    setResult(null);
    setNumpadTarget("attendance");
    setView("BADGE");
  };

  const resetEnrollment = () => {
    setEnrollBadge("");
    setEnrollBadgeError("");
    setEnrollEmployee(null);
    setEnrollError("");
    setNumpadTarget("attendance");
    setView("BADGE");
  };

  const handleSessionExpired = () => {
    localStorage.removeItem(KIOSK_TOKEN_KEY);
    localStorage.removeItem(KIOSK_BUSINESS_KEY);
    setKioskToken(null);
    setBusiness(null);
    setView("LOGIN");
  };

  const handleCloseKiosk = () => {
    if (!window.confirm("هل تريد إغلاق بوابة البصمة؟ سيحتاج فتحها مجدداً لتسجيل الدخول.")) return;
    handleSessionExpired();
  };

  // ── Login Handler ────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/kiosk/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const json = await res.json();
      if (json.success && json.data?.kioskToken) {
        const { kioskToken: token, business: biz } = json.data;
        setKioskToken(token);
        setBusiness(biz);
        localStorage.setItem(KIOSK_TOKEN_KEY, token);
        localStorage.setItem(KIOSK_BUSINESS_KEY, JSON.stringify(biz));
        setLoginEmail("");
        setLoginPassword("");
        setView("BADGE");
      } else {
        setLoginError(json.error || "فشل تسجيل الدخول. تحقق من بياناتك.");
      }
    } catch {
      setLoginError("حدث خطأ في الاتصال. تحقق من الإنترنت.");
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Keypad Input Handler ──────────────────────────────────────────────────

  const handleNumpad = useCallback(
    (key: string) => {
      const isEnroll = numpadTarget === "enroll";
      if (key === "⌫") {
        if (isEnroll) setEnrollBadge((p) => p.slice(0, -1));
        else setBadgeInput((p) => p.slice(0, -1));
        setBadgeError("");
        setEnrollBadgeError("");
      } else if (key === "EMP") {
        if (isEnroll) {
          setEnrollBadge((p) => (p.toUpperCase().startsWith("EMP") ? p : "EMP" + p));
        } else {
          setBadgeInput((p) => (p.toUpperCase().startsWith("EMP") ? p : "EMP" + p));
        }
        setBadgeError("");
        setEnrollBadgeError("");
      } else if (key === "CLEAR") {
        if (isEnroll) setEnrollBadge("");
        else setBadgeInput("");
        setBadgeError("");
        setEnrollBadgeError("");
      } else {
        const max = 15;
        if (isEnroll && enrollBadge.length < max) {
          setEnrollBadge((p) => (p + key).toUpperCase());
        }
        if (!isEnroll && badgeInput.length < max) {
          setBadgeInput((p) => (p + key).toUpperCase());
        }
        setBadgeError("");
        setEnrollBadgeError("");
      }
    },
    [numpadTarget, enrollBadge, badgeInput]
  );

  // ── Attendance: Badge Lookup ─────────────────────────────────────────────

  const handleBadgeLookup = async () => {
    if (!badgeInput.trim() || !kioskToken) return;
    setBadgeError("");
    setBadgeLoading(true);
    try {
      const res = await fetch(`/api/kiosk/employees?badge=${encodeURIComponent(badgeInput.trim())}`, {
        headers: { "x-kiosk-token": kioskToken },
      });
      if (res.status === 401) { handleSessionExpired(); return; }
      const json = await res.json();
      if (json.success && json.data?.employee) {
        setFoundEmployee(json.data.employee as FoundEmployee);
        setView("ACTION");
      } else {
        setBadgeError(json.error || "الرقم الوظيفي غير موجود.");
      }
    } catch {
      setBadgeError("خطأ في الاتصال بالخادم.");
    } finally {
      setBadgeLoading(false);
    }
  };

  // ── Attendance: Action → Fingerprint ─────────────────────────────────────

  const handleActionSelect = (action: PunchAction) => {
    setSelectedAction(action);
    setFingerprintError("");
    setView("FINGERPRINT");
  };

  // ── Attendance: WebAuthn Auth ─────────────────────────────────────────────

  const handleFingerprint = useCallback(async () => {
    if (!foundEmployee || !selectedAction || !kioskToken) return;
    setFingerprintLoading(true);
    setFingerprintError("");
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");

      const startRes = await fetch("/api/kiosk/fingerprint/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-kiosk-token": kioskToken },
        body: JSON.stringify({ badgeNumber: badgeInput.trim(), action: selectedAction }),
      });
      if (startRes.status === 401) { handleSessionExpired(); return; }
      const startJson = await startRes.json();
      if (!startRes.ok || !startJson.data?.options) {
        setFingerprintError(startJson.error || "فشل بدء التحقق بالبصمة.");
        return;
      }

      let authResponse;
      try {
        authResponse = await startAuthentication({ optionsJSON: startJson.data.options });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        setFingerprintError(
          msg.includes("cancelled") || msg.includes("NotAllowedError")
            ? "تم إلغاء التحقق. حاول مرة أخرى."
            : "فشل استشعار البصمة. تأكد أن الجهاز يدعم البصمة."
        );
        return;
      }

      const verifyRes = await fetch("/api/kiosk/fingerprint/auth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-kiosk-token": kioskToken },
        body: JSON.stringify({ employeeId: startJson.data.employee.id, authResponse }),
      });
      if (verifyRes.status === 401) { handleSessionExpired(); return; }
      const verifyJson = await verifyRes.json();

      if (verifyJson.success && verifyJson.data) {
        const d = verifyJson.data;
        const clockTime = d.action === "CLOCK_IN" ? d.record.clockIn : d.record.clockOut;
        setResult({
          type: "SUCCESS",
          message: d.message,
          employeeName: d.employee?.nameAr,
          action: d.action,
          time: clockTime
            ? new Date(clockTime).toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit", hour12: true })
            : formatTime(new Date()),
          branch: d.employee?.branch,
        });
      } else {
        setResult({ type: "ERROR", message: verifyJson.error || "فشل التحقق من البصمة." });
      }
      setView("RESULT");
    } catch {
      setFingerprintError("حدث خطأ غير متوقع. أعد المحاولة.");
    } finally {
      setFingerprintLoading(false);
    }
  }, [foundEmployee, selectedAction, kioskToken, badgeInput]);

  // ── Enrollment: Badge Lookup ─────────────────────────────────────────────

  const handleEnrollBadgeLookup = async () => {
    if (!enrollBadge.trim() || !kioskToken) return;
    setEnrollBadgeError("");
    setEnrollBadgeLoading(true);
    try {
      const res = await fetch(`/api/kiosk/employees?badge=${encodeURIComponent(enrollBadge.trim())}`, {
        headers: { "x-kiosk-token": kioskToken },
      });
      if (res.status === 401) { handleSessionExpired(); return; }
      const json = await res.json();
      if (json.success && json.data?.employee) {
        setEnrollEmployee(json.data.employee as FoundEmployee);
        setView("ENROLL_CONFIRM");
      } else {
        setEnrollBadgeError(json.error || "الرقم الوظيفي غير موجود.");
      }
    } catch {
      setEnrollBadgeError("خطأ في الاتصال بالخادم.");
    } finally {
      setEnrollBadgeLoading(false);
    }
  };

  // ── Enrollment: WebAuthn Registration ────────────────────────────────────

  const handleEnrollScan = useCallback(async () => {
    if (!enrollEmployee || !kioskToken) return;
    setEnrollLoading(true);
    setEnrollError("");
    setView("ENROLL_SCAN");

    try {
      const { startRegistration } = await import("@simplewebauthn/browser");

      // Step 1: Get registration challenge
      const startRes = await fetch("/api/kiosk/fingerprint/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-kiosk-token": kioskToken },
        body: JSON.stringify({ badgeNumber: enrollBadge.trim() }),
      });
      if (startRes.status === 401) { handleSessionExpired(); return; }
      const startJson = await startRes.json();
      if (!startRes.ok || !startJson.data?.options) {
        setEnrollError(startJson.error || "فشل بدء تسجيل البصمة.");
        setView("ENROLL_CONFIRM");
        return;
      }

      // Step 2: Device prompts for fingerprint
      let regResponse;
      try {
        regResponse = await startRegistration({ optionsJSON: startJson.data.options });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        setEnrollError(
          msg.includes("cancelled") || msg.includes("NotAllowedError")
            ? "تم إلغاء تسجيل البصمة."
            : "فشل استشعار البصمة. تأكد أن الجهاز يدعم Touch ID أو بصمة الإصبع."
        );
        setView("ENROLL_CONFIRM");
        return;
      }

      // Step 3: Save credential
      const finishRes = await fetch("/api/kiosk/fingerprint/enroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-kiosk-token": kioskToken },
        body: JSON.stringify({ employeeId: startJson.data.employee.id, registrationResponse: regResponse }),
      });
      if (finishRes.status === 401) { handleSessionExpired(); return; }
      const finishJson = await finishRes.json();

      if (finishRes.ok && finishJson.data?.enrolled) {
        setView("ENROLL_DONE");
      } else {
        setEnrollError(finishJson.error || "فشل حفظ بيانات البصمة.");
        setView("ENROLL_CONFIRM");
      }
    } catch {
      setEnrollError("حدث خطأ غير متوقع. أعد المحاولة.");
      setView("ENROLL_CONFIRM");
    } finally {
      setEnrollLoading(false);
    }
  }, [enrollEmployee, enrollBadge, kioskToken]);

  // ════════════════════════════════════════════════════════════════════════
  //  SHARED HEADER
  // ════════════════════════════════════════════════════════════════════════

  const KioskHeader = ({ showEnrollBtn = true }: { showEnrollBtn?: boolean }) => (
    <header className="flex items-center justify-between px-6 py-4 border-b border-stone-800/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {business?.logo ? (
          <Image src={business.logo} alt={business.nameAr || ""} width={40} height={40} className="rounded-xl object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
        )}
        <div>
          <p className="text-white font-bold text-sm">{business?.nameAr}</p>
          <p className="text-stone-400 text-xs flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-500" />
            <span>بوابة الحضور والانصراف</span>
          </p>
        </div>
      </div>

      <div className="text-left">
        <p className="text-white font-black text-xl font-mono tracking-widest">{formatTime(currentTime)}</p>
        <p className="text-stone-400 text-xs">{formatDate(currentTime)}</p>
      </div>

      <div className="flex items-center gap-2">
        {showEnrollBtn && (
          <button
            onClick={() => {
              setEnrollBadge("");
              setEnrollBadgeError("");
              setEnrollEmployee(null);
              setEnrollError("");
              setNumpadTarget("enroll");
              setView("ENROLL_BADGE");
            }}
            className="p-2 rounded-xl border border-amber-600/50 hover:bg-amber-600/20 text-amber-400 hover:text-amber-300 transition-all"
            title="تسجيل بصمة موظف جديد"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handleCloseKiosk}
          className="p-2 rounded-xl border border-stone-700 hover:bg-stone-800 text-stone-400 hover:text-rose-400 transition-all"
          title="إغلاق البوابة"
        >
          <Lock className="w-4 h-4" />
        </button>
      </div>
    </header>
  );

  // ════════════════════════════════════════════════════════════════════════
  //  SHARED KEYPAD COMPONENT (Numbers + English Letters + EMP Quick-Key)
  // ════════════════════════════════════════════════════════════════════════

  const KioskKeypad = ({
    onKey,
    onConfirm,
    confirmLoading,
    confirmDisabled,
  }: {
    onKey: (k: string) => void;
    onConfirm: () => void;
    confirmLoading: boolean;
    confirmDisabled: boolean;
  }) => (
    <div className="space-y-3">
      {/* Top Controls: Mode switcher + Quick EMP key */}
      <div className="flex items-center justify-between gap-2 p-1.5 bg-stone-950/70 rounded-2xl border border-stone-800/80">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setKeypadMode("NUM")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              keypadMode === "NUM"
                ? "bg-amber-600 text-white shadow-md"
                : "text-stone-400 hover:text-white hover:bg-stone-800"
            }`}
          >
            123 الأرقام
          </button>
          <button
            type="button"
            onClick={() => setKeypadMode("ABC")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              keypadMode === "ABC"
                ? "bg-amber-600 text-white shadow-md"
                : "text-stone-400 hover:text-white hover:bg-stone-800"
            }`}
          >
            ABC الحروف
          </button>
        </div>

        <button
          type="button"
          onClick={() => onKey("EMP")}
          className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-black tracking-wider transition-all active:scale-95"
          title="إضافة بادئة EMP تلقائياً"
        >
          + EMP
        </button>
      </div>

      {keypadMode === "NUM" ? (
        <div className="grid grid-cols-3 gap-2.5">
          {["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "⌫", "OK"].map((key) => {
            const isOK = key === "OK";
            const isDel = key === "⌫";
            return (
              <button
                key={key}
                type="button"
                onClick={() => (isOK ? onConfirm() : onKey(key))}
                disabled={(isOK && confirmDisabled) || (isOK && confirmLoading)}
                className={`h-14 rounded-2xl font-black text-lg transition-all active:scale-95 ${
                  isOK
                    ? "bg-amber-600 hover:bg-amber-500 text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                    : isDel
                    ? "bg-stone-700 hover:bg-stone-600 text-stone-200"
                    : "bg-stone-800 hover:bg-stone-700 text-white border border-stone-700/50"
                }`}
              >
                {isOK ? (
                  confirmLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "✓"
                ) : isDel ? (
                  <Delete className="w-5 h-5 mx-auto" />
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Row 1 */}
          <div className="grid grid-cols-10 gap-1">
            {["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => onKey(char)}
                className="h-11 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-sm border border-stone-700/50 active:scale-95 transition-all"
              >
                {char}
              </button>
            ))}
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-9 gap-1 px-2">
            {["A", "S", "D", "F", "G", "H", "J", "K", "L"].map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => onKey(char)}
                className="h-11 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-sm border border-stone-700/50 active:scale-95 transition-all"
              >
                {char}
              </button>
            ))}
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-9 gap-1">
            {["Z", "X", "C", "V", "B", "N", "M", "-"].map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => onKey(char)}
                className="h-11 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-sm border border-stone-700/50 active:scale-95 transition-all"
              >
                {char}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onKey("⌫")}
              className="h-11 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 font-bold text-sm active:scale-95 transition-all flex items-center justify-center"
              title="مسح"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          {/* Row 4: Mode Switcher, Quick EMP, and Confirm */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setKeypadMode("NUM")}
              className="h-12 rounded-xl bg-stone-700 hover:bg-stone-600 text-white font-bold text-xs active:scale-95 transition-all"
            >
              123 الأرقام
            </button>
            <button
              type="button"
              onClick={() => onKey("EMP")}
              className="h-12 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-black text-xs active:scale-95 transition-all border border-amber-500/40"
            >
              + EMP
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled || confirmLoading}
              className="h-12 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
            >
              {confirmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "✓ تأكيد"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  //  RENDER: LOGIN
  // ════════════════════════════════════════════════════════════════════════

  if (view === "LOGIN") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-600 shadow-2xl shadow-amber-900/60 mb-5">
              <Fingerprint className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mb-1">بوابة الحضور والانصراف</h1>
            <p className="text-xs text-stone-400">خاص بأصحاب محلات مواد البناء — سجّل دخولك لفتح شاشة البصمة</p>
          </div>

          <div className="bg-stone-900/80 backdrop-blur-xl border border-stone-800/60 rounded-3xl p-6 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">البريد الإلكتروني لصاحب المحل</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="admin@yourstore.com"
                  className="w-full px-4 py-3 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pl-11 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}
              <button type="submit" disabled={loginLoading} className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-60">
                {loginLoading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>جاري فتح البوابة...</span></> : <><LogIn className="w-4 h-4" /><span>فتح شاشة البصمة</span></>}
              </button>
            </form>
            <div className="mt-4 p-3 rounded-xl bg-stone-800/50 border border-stone-700/50 flex items-start gap-2 text-xs text-stone-400">
              <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>الجلسة تظل مفتوحة 24 ساعة. بعدها يلزم إعادة تسجيل الدخول.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  //  RENDER: RESULT (Attendance)
  // ════════════════════════════════════════════════════════════════════════

  if (view === "RESULT" && result) {
    const isSuccess = result.type === "SUCCESS";
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isSuccess ? "bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-950" : "bg-gradient-to-br from-rose-950 via-rose-900 to-stone-950"}`} dir="rtl">
        <div className="text-center space-y-6 max-w-sm w-full">
          <div className={`inline-flex items-center justify-center w-28 h-28 rounded-full shadow-2xl ${isSuccess ? "bg-emerald-500/20 border-4 border-emerald-400" : "bg-rose-500/20 border-4 border-rose-400"}`}>
            {isSuccess ? <CheckCircle2 className="w-14 h-14 text-emerald-400" /> : <XCircle className="w-14 h-14 text-rose-400" />}
          </div>
          <div>
            <h2 className={`text-3xl font-black mb-3 ${isSuccess ? "text-white" : "text-rose-100"}`}>
              {result.employeeName || (isSuccess ? "تم التسجيل" : "خطأ")}
            </h2>
            <p className={`text-base font-medium ${isSuccess ? "text-emerald-200" : "text-rose-200"}`}>{result.message}</p>
          </div>
          {isSuccess && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-stone-300">العملية:</span>
                <span className="font-bold text-white">{result.action === "CLOCK_IN" ? "✅ تسجيل حضور" : "🏁 تسجيل انصراف"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-300">الوقت:</span>
                <span className="font-bold text-white font-mono">{result.time}</span>
              </div>
              {result.branch && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-300">الفرع:</span>
                  <span className="font-bold text-white">{result.branch}</span>
                </div>
              )}
            </div>
          )}
          <p className={`text-xs ${isSuccess ? "text-emerald-400/70" : "text-rose-400/70"}`}>تعود الشاشة تلقائياً خلال ثوانٍ...</p>
          <button onClick={resetAttendance} className="px-6 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm transition-all">
            العودة للشاشة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  //  RENDER: BADGE ENTRY (Attendance)
  // ════════════════════════════════════════════════════════════════════════

  if (view === "BADGE") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex flex-col" dir="rtl">
        <KioskHeader />
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-600/20 border border-amber-600/40 mb-3">
                <User className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-white font-black text-xl">أدخل رقمك الوظيفي</h2>
              <p className="text-stone-400 text-xs mt-1">اكتب رقمك (مثال: EMP352 أو 352) ثم اضغط ✓</p>
            </div>

            <div className="bg-stone-900/80 backdrop-blur-xl border border-stone-800/60 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="bg-stone-800 border-2 border-stone-700 focus-within:border-amber-500 rounded-2xl px-4 py-3 text-center transition-colors">
                <input
                  type="text"
                  dir="ltr"
                  value={badgeInput}
                  onChange={(e) => {
                    setBadgeInput(e.target.value.toUpperCase().replace(/\s/g, ""));
                    setBadgeError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleBadgeLookup();
                  }}
                  placeholder="EMP..."
                  className="w-full bg-transparent text-center text-3xl sm:text-4xl font-black font-mono tracking-widest text-white placeholder-stone-600 focus:outline-none"
                  autoFocus
                />
              </div>
              {badgeError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{badgeError}</span>
                </div>
              )}
              <KioskKeypad
                onKey={(k) => { setNumpadTarget("attendance"); handleNumpad(k); }}
                onConfirm={handleBadgeLookup}
                confirmLoading={badgeLoading}
                confirmDisabled={!badgeInput.trim()}
              />
            </div>

            {webAuthnSupported === false && (
              <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-800/50 text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>تنبيه: هذا الجهاز لا يدعم البصمة الحيوية.</span>
              </div>
            )}

            <p className="text-center text-stone-600 text-xs flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>ادخل رقمك الوظيفي لبدء تسجيل الدوام</span>
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  //  RENDER: ACTION SELECTION
  // ════════════════════════════════════════════════════════════════════════

  if (view === "ACTION" && foundEmployee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex flex-col" dir="rtl">
        <KioskHeader />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-600/20 border-2 border-amber-500/50 mb-4">
                <User className="w-10 h-10 text-amber-400" />
              </div>
              <h2 className="text-white font-black text-2xl">{foundEmployee.nameAr}</h2>
              {foundEmployee.jobTitle && <p className="text-stone-400 text-sm mt-1">{foundEmployee.jobTitle}</p>}
              <p className="text-stone-500 text-xs mt-1 font-mono">#{badgeInput}</p>
            </div>
            <div className="bg-stone-900/80 backdrop-blur-xl border border-stone-800/60 rounded-3xl p-6 shadow-2xl space-y-4">
              <p className="text-center text-stone-300 text-sm font-bold mb-2">ماذا تريد تسجيل؟</p>
              <button onClick={() => handleActionSelect("CLOCK_IN")} className="w-full py-5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95">
                <LogIn className="w-6 h-6" /><span>حضور</span>
              </button>
              <button onClick={() => handleActionSelect("CLOCK_OUT")} className="w-full py-5 rounded-2xl bg-rose-700 hover:bg-rose-600 text-white font-black text-xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95">
                <LogOut className="w-6 h-6" /><span>انصراف</span>
              </button>
              <button onClick={resetAttendance} className="w-full py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-400 text-sm font-bold transition-all flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /><span>رجوع</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  //  RENDER: FINGERPRINT (Attendance)
  // ════════════════════════════════════════════════════════════════════════

  if (view === "FINGERPRINT" && foundEmployee && selectedAction) {
    const isClockIn = selectedAction === "CLOCK_IN";
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex flex-col" dir="rtl">
        <KioskHeader />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-5">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-14 h-7 rounded-full text-xs font-black mb-4 ${isClockIn ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
                {isClockIn ? "حضور" : "انصراف"}
              </div>
              <h2 className="text-white font-black text-2xl">{foundEmployee.nameAr}</h2>
              <p className="text-stone-500 text-xs mt-1 font-mono">#{badgeInput}</p>
            </div>

            <div className="bg-stone-900/80 backdrop-blur-xl border border-stone-800/60 rounded-3xl p-8 shadow-2xl text-center space-y-6">
              <div className="flex items-center justify-center">
                <div
                  className={`relative inline-flex items-center justify-center w-32 h-32 rounded-full border-4 transition-all cursor-pointer ${
                    fingerprintLoading ? "border-amber-400 bg-amber-600/10 animate-pulse" : "border-stone-600 bg-stone-800/60 hover:border-amber-500 hover:bg-amber-600/10"
                  }`}
                  onClick={!fingerprintLoading ? handleFingerprint : undefined}
                >
                  {fingerprintLoading ? <Loader2 className="w-14 h-14 text-amber-400 animate-spin" /> : <Fingerprint className="w-16 h-16 text-amber-400" />}
                </div>
              </div>
              <div>
                <p className="text-white font-black text-lg">{fingerprintLoading ? "جاري التحقق..." : "ضع إصبعك على المستشعر"}</p>
                <p className="text-stone-400 text-sm mt-1">{fingerprintLoading ? "انتظر لحظة..." : "اضغط على البصمة أعلاه أو الزر أدناه"}</p>
              </div>
              {fingerprintError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2 text-right">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{fingerprintError}</span>
                </div>
              )}
              {!fingerprintLoading && (
                <button onClick={handleFingerprint} className="w-full py-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-lg transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95">
                  <Fingerprint className="w-6 h-6" /><span>تحقق بالبصمة</span>
                </button>
              )}
              <button onClick={() => { setSelectedAction(null); setFingerprintError(""); setView("ACTION"); }} disabled={fingerprintLoading} className="w-full py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-400 text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                <RefreshCw className="w-4 h-4" /><span>رجوع</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-stone-900/50 border border-stone-800/50 flex items-start gap-2 text-xs text-stone-500">
              <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>التحقق بالبصمة آمن تماماً. البيانات لا تغادر هذا الجهاز.</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  //  RENDER: ENROLLMENT — BADGE ENTRY
  // ════════════════════════════════════════════════════════════════════════

  if (view === "ENROLL_BADGE") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-indigo-950 to-stone-950 flex flex-col" dir="rtl">
        <KioskHeader showEnrollBtn={false} />
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md space-y-5">
            {/* Title */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-600/40 mb-3">
                <UserPlus className="w-7 h-7 text-indigo-400" />
              </div>
              <h2 className="text-white font-black text-xl">تسجيل بصمة موظف</h2>
              <p className="text-stone-400 text-xs mt-1">أدخل الرقم الوظيفي (مثال: EMP352 أو 352) ثم اضغط ✓</p>
            </div>

            <div className="bg-stone-900/80 backdrop-blur-xl border border-indigo-800/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="bg-stone-800 border-2 border-stone-700 focus-within:border-indigo-500 rounded-2xl px-4 py-3 text-center transition-colors">
                <input
                  type="text"
                  dir="ltr"
                  value={enrollBadge}
                  onChange={(e) => {
                    setEnrollBadge(e.target.value.toUpperCase().replace(/\s/g, ""));
                    setEnrollBadgeError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEnrollBadgeLookup();
                  }}
                  placeholder="EMP..."
                  className="w-full bg-transparent text-center text-3xl sm:text-4xl font-black font-mono tracking-widest text-white placeholder-stone-600 focus:outline-none"
                  autoFocus
                />
              </div>
              {enrollBadgeError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{enrollBadgeError}</span>
                </div>
              )}
              <KioskKeypad
                onKey={(k) => { setNumpadTarget("enroll"); handleNumpad(k); }}
                onConfirm={handleEnrollBadgeLookup}
                confirmLoading={enrollBadgeLoading}
                confirmDisabled={!enrollBadge.trim()}
              />
            </div>

            <button onClick={resetEnrollment} className="w-full py-3 rounded-2xl bg-stone-800/60 hover:bg-stone-800 text-stone-400 text-sm font-bold transition-all flex items-center justify-center gap-2">
              <ArrowRight className="w-4 h-4" /><span>إلغاء والعودة للشاشة الرئيسية</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  //  RENDER: ENROLLMENT — CONFIRM EMPLOYEE
  // ════════════════════════════════════════════════════════════════════════

  if (view === "ENROLL_CONFIRM" && enrollEmployee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-indigo-950 to-stone-950 flex flex-col" dir="rtl">
        <KioskHeader showEnrollBtn={false} />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-5">
            {/* Employee card */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-600/20 border-2 border-indigo-500/50 mb-4">
                <User className="w-10 h-10 text-indigo-400" />
              </div>
              <h2 className="text-white font-black text-2xl">{enrollEmployee.nameAr}</h2>
              {enrollEmployee.jobTitle && <p className="text-stone-400 text-sm mt-1">{enrollEmployee.jobTitle}</p>}
              <p className="text-stone-500 text-xs mt-1 font-mono">#{enrollBadge}</p>

              {enrollEmployee.fingerprintEnrolled && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-600/20 border border-amber-600/40 text-amber-300 text-xs font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>بصمة مسجلة مسبقاً — ستُحذف وتُستبدل بالجديدة</span>
                </div>
              )}
            </div>

            <div className="bg-stone-900/80 backdrop-blur-xl border border-indigo-800/40 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="p-4 rounded-xl bg-indigo-950/50 border border-indigo-800/50 text-center space-y-2">
                <Fingerprint className="w-10 h-10 text-indigo-400 mx-auto" />
                <p className="text-white font-bold text-sm">اطلب من الموظف وضع إصبعه</p>
                <p className="text-stone-400 text-xs">سيطلب الجهاز بصمة الإصبع مباشرةً بعد الضغط أدناه</p>
              </div>

              {enrollError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{enrollError}</span>
                </div>
              )}

              <button
                onClick={handleEnrollScan}
                disabled={enrollLoading}
                className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95 disabled:opacity-60"
              >
                <Fingerprint className="w-6 h-6" />
                <span>ابدأ تسجيل البصمة الآن</span>
              </button>

              <button onClick={() => setView("ENROLL_BADGE")} className="w-full py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-400 text-sm font-bold transition-all flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /><span>رجوع</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  //  RENDER: ENROLLMENT — SCANNING (loading state)
  // ════════════════════════════════════════════════════════════════════════

  if (view === "ENROLL_SCAN") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-indigo-950 to-stone-950 flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="text-center space-y-8 max-w-sm w-full">
          <div className="inline-flex items-center justify-center w-36 h-36 rounded-full border-4 border-indigo-400 bg-indigo-600/10 animate-pulse">
            <Fingerprint className="w-16 h-16 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-white font-black text-2xl">ضع إصبعك الآن</h2>
            <p className="text-stone-400 text-sm mt-2">الجهاز يحاول قراءة بصمتك...</p>
            <p className="text-indigo-400 text-xs mt-1">اتبع تعليمات الجهاز وانتظر</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-stone-500 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>جاري التسجيل...</span>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  //  RENDER: ENROLLMENT — DONE ✅
  // ════════════════════════════════════════════════════════════════════════

  if (view === "ENROLL_DONE") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-stone-950 flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="text-center space-y-6 max-w-sm w-full">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-indigo-500/20 border-4 border-indigo-400 shadow-2xl">
            <CheckCircle2 className="w-14 h-14 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white mb-3">
              {enrollEmployee?.nameAr || "الموظف"}
            </h2>
            <p className="text-indigo-200 text-base font-medium">
              ✅ تم تسجيل البصمة بنجاح!
            </p>
            <p className="text-stone-400 text-sm mt-2">
              يمكن للموظف الآن استخدام بصمته على هذا الجهاز لتسجيل الحضور والانصراف.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 text-sm text-right space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-stone-300">الموظف:</span>
              <span className="font-bold text-white">{enrollEmployee?.nameAr}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-300">الرقم الوظيفي:</span>
              <span className="font-bold text-white font-mono">#{enrollBadge}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-300">الجهاز:</span>
              <span className="font-bold text-indigo-300">هذا الجهاز ✓</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setEnrollBadge("");
                setEnrollEmployee(null);
                setEnrollError("");
                setView("ENROLL_BADGE");
              }}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>تسجيل بصمة موظف آخر</span>
            </button>
            <button
              onClick={resetEnrollment}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all"
            >
              العودة لشاشة الحضور
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
