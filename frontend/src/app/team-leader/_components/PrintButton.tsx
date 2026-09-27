"use client";

import { Button } from "@/components/ui/Button";

import { useT } from "@/lib/i18n";
export function PrintButton() {
  const t = useT();
  return (
    <Button variant="secondary" className="no-print" onClick={() => window.print()}>
      {t("print")}
    </Button>
  );
}
