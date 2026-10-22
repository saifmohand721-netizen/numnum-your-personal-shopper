import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

import appIcon from "@/assets/diz-app-icon.png";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "diz-install-dismissed";

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone || localStorage.getItem(KEY)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios/i.test(ua)) {
      setIos(true);
      setOpen(true);
    }
    const onInstalled = () => setOpen(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const close = () => {
    localStorage.setItem(KEY, "1");
    setOpen(false);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice.catch(() => null);
    setEvt(null);
    close();
  };

  if (!open) return null;

  return (
    <div dir="rtl" className="fixed inset-0 z-[100] grid place-items-center bg-foreground/60 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="ثبّت تطبيق دز">
      <div className="relative w-full max-w-xs animate-intro-pop rounded-3xl bg-card p-6 text-center text-card-foreground shadow-2xl">
        <button onClick={close} aria-label="إغلاق" className="absolute left-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted">
          <X className="size-4" />
        </button>
        <img src={appIcon} alt="شعار دز" width={64} height={64} className="mx-auto size-16 rounded-2xl shadow-lg" />
        <h2 className="mt-4 text-xl font-black">ثبّت تطبيق دز</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {ios ? "اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»" : "افتح دز مباشرة من شاشتك مثل أي تطبيق"}
        </p>
        {ios ? (
          <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-bold">
            <Share className="size-4" /> مشاركة ← إضافة للشاشة
          </div>
        ) : (
          <button onClick={install} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground active:scale-[0.98]">
            <Download className="size-4" /> تثبيت التطبيق
          </button>
        )}
        <button onClick={close} className="mt-3 text-xs text-muted-foreground">ليس الآن</button>
      </div>
    </div>
  );
}
