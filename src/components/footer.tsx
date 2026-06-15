import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/brand-logo";

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 sm:flex-row sm:items-center">
        <div>
          <BrandLogo />
          <p className="mt-2 text-sm text-muted-foreground">{t("brand.tagline")}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          © {year} FarmHelper. {t("landing.footerRights")}
        </p>
      </div>
    </footer>
  );
}
