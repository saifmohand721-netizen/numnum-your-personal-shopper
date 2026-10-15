import { useEffect, useRef, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";

import appIcon from "@/assets/diz-app-icon.png";
import { Button } from "@/components/ui/button";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice?: Promise<{ outcome: string }> };
const DISMISS_KEY = "numnum-install-dismissed";

// Welcome splash (logo + greeting) on every app open, then a centered install card
// for visitors who are not already running the installed app.
export function AppIntro() {
  const [phase, setPhase] = useState<"splash" | "leaving" | "install" | "done">("splash");
  const [ios, setIos] = useState(false);
  const deferred = useRef<InstallEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); deferred.current = e as InstallEvent; };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    const dismissed = (() => { try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; } })();
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIos);

    const t1 = window.setTimeout(() => setPhase("leaving"), 1700);
    const t2 = window.setTimeout(() => {
      const canOffer = !standalone && !dismissed && (isIos || !!deferred.current);
      setPhase(canOffer ? "install" : "done");
    }, 2200);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.removeEventListener("beforeinstallprompt", onPrompt); };
  }, []);

  function close() {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setPhase("done");
  }

  async function install() {
    const ev = deferred.current;
    if (!ev) return;
    await ev.prompt();
    try { await ev.userChoice; } catch { /* ignore */ }
    deferred.current = null;
    close();
  }

  if (phase === "done") return null;

  if (phase === "splash" || phase === "leaving") {
    return (
      <div dir="rtl" aria-label="مرحباً بك في دز" className={`fixed inset-0 z-[100] grid place-items-center bg-intro px-8 transition-opacity duration-500 ${phase === "leaving" ? "opacity-0" : "opacity-100"}`}>
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <span className="absolute inset-0 animate-ping rounded-[2rem] bg-primary/25" />
            <img src={appIcon} alt="دز" width={112} height={112} className="relative size-28 animate-intro-pop rounded-[2rem] shadow-2xl" />
          </div>
          <h1 className="mt-7 animate-intro-rise text-4xl font-black text-primary">دز</h1>
          <p className="mt-2 animate-intro-rise text-lg font-bold text-foreground [animation-delay:150ms]">أهلاً وسهلاً بك 👋</p>
          <p className="mt-1 animate-intro-rise text-sm text-muted-foreground [animation-delay:300ms]">متسوقك الشخصي — نشتري ونوصل لك أي شيء</p>
          <div className="mt-8 flex gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => <span key={i} className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${i * 120}ms` }} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" role="dialog" aria-modal="true" aria-label="تثبيت دز" className="fixed inset-0 z-[100] grid place-items-center bg-foreground/50 px-6 backdrop-blur-sm">
      <div className="relative w-full max-w-[340px] animate-intro-pop rounded-3xl border border-border bg-card p-6 text-center shadow-2xl">
        <button type="button" onClick={close} aria-label="إغلاق" className="absolute left-3 top-3 grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"><X className="size-5" /></button>
        <img src={appIcon} alt="" width={72} height={72} className="mx-auto size-[72px] rounded-2xl shadow-lg" />
        <h2 className="mt-4 text-xl font-black">ثبّت دز على هاتفك</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">افتحه بلمسة من الشاشة الرئيسية، بسرعة وبملء الشاشة مثل أي تطبيق.</p>
        {ios ? (
          <ol className="mt-5 space-y-2 rounded-2xl bg-muted p-4 text-right text-sm">
            <li className="flex items-center gap-2"><Share className="size-4 shrink-0 text-primary" />اضغط زر المشاركة في Safari</li>
            <li className="flex items-center gap-2"><SquarePlus className="size-4 shrink-0 text-primary" />اختر «إضافة إلى الشاشة الرئيسية»</li>
          </ol>
        ) : (
          <Button variant="hero" size="xl" className="mt-6 w-full" onClick={() => void install()}><Download />تثبيت التطبيق</Button>
        )}
        <button type="button" onClick={close} className="mt-3 w-full py-2 text-sm font-bold text-muted-foreground">ليس الآن</button>
      </div>
    </div>
  );
}
