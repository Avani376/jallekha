"use client";

/** Language switcher (English | मराठी), persisted per browser. */

import { useI18n } from "@/lib/i18n";
import { cx } from "./ui";

export function LanguageSwitcher({ onDark = false }: { onDark?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      role="radiogroup"
      aria-label={t("header.settings") === "सेटिंग्ज" ? "भाषा" : "Language"}
      className="flex overflow-hidden rounded-lg border text-[11.5px] font-bold"
    >
      <button
        role="radio"
        aria-checked={locale === "en"}
        onClick={() => setLocale("en")}
        className={cx(
          "px-2 py-1.5 transition-colors",
          locale === "en"
            ? "bg-ink text-white"
            : onDark
              ? "bg-transparent text-white/60 hover:text-white"
              : "bg-white text-slate-500 hover:text-ink",
        )}
      >
        EN
      </button>
      <button
        role="radio"
        aria-checked={locale === "mr"}
        onClick={() => setLocale("mr")}
        className={cx(
          "px-2 py-1.5 transition-colors",
          locale === "mr"
            ? "bg-ink text-white"
            : onDark
              ? "bg-transparent text-white/60 hover:text-white"
              : "bg-white text-slate-500 hover:text-ink",
        )}
      >
        मराठी
      </button>
    </div>
  );
}
