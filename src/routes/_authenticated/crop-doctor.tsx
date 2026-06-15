import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Stethoscope, Loader2, Camera, AlertTriangle } from "lucide-react";

import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { cropDoctor, listDiagnoses } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/crop-doctor")({
  head: () => ({ meta: [{ title: "Crop Doctor — FarmHelper" }] }),
  component: CropDoctorPage,
});

type DiagnosisResult = {
  disease_name: string;
  cause: string;
  organic_treatment: string;
  chemical_treatment: string;
  dosage: string;
  prevention: string;
  confidence: number;
};

type DiagnosisRow = {
  id: string;
  crop_name: string | null;
  symptoms: string | null;
  ai_result: DiagnosisResult | null;
  image_path: string | null;
  created_at: string;
};

function CropDoctorPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const diagFn = useServerFn(cropDoctor);
  const listFn = useServerFn(listDiagnoses);

  const history = useQuery({ queryKey: ["diagnoses"], queryFn: () => listFn() });

  const [crop, setCrop] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fallback, setFallback] = useState<string | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: diagFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diagnoses"] });
      toast.success(t("cropDoctor.ready"));
      setFallback(null);
    },
    onError: (e: Error) => {
      setFallback(t("cropDoctor.fallback", { crop: crop || t("cropDoctor.cropName") }));
      toast.error(e.message);
    },
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error(t("market.errors.imageType"));
    if (file.size > 5 * 1024 * 1024) return toast.error(t("market.errors.imageSize"));
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/diagnoses/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("farmhelper-images").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return toast.error(error.message);
    setImagePath(path);
    setImgError(null);
    toast.success(t("cropDoctor.imageAttached"));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!crop.trim() || symptoms.trim().length < 3) {
      toast.error(t("cropDoctor.missingInputs"));
      return;
    }
    if (!imagePath) {
      setImgError(t("cropDoctor.photoMissing"));
      toast.error(t("cropDoctor.photoMissing"));
      return;
    }
    setImgError(null);
    mut.mutate({
      data: {
        crop_name: crop.trim(),
        symptoms: symptoms.trim(),
        image_path: imagePath,
        country: profile?.country ?? null,
        region: profile?.region ?? null,
        currency: profile?.currency ?? "USD",
        language: profile?.country === "BD" && profile?.preferred_language === "bn" ? "bn" : "en",
      },
    });
  }

  const latest = history.data?.[0] as DiagnosisRow | undefined;

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Stethoscope className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("cropDoctor.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("cropDoctor.subtitle")}</p>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader><CardTitle className="text-lg">{t("cropDoctor.newDiagnosis")}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-2"><Label>{t("cropDoctor.cropName")}</Label>
                <Input value={crop} onChange={(e) => setCrop(e.target.value)} placeholder={t("cropDoctor.cropPlaceholder")} maxLength={80} />
              </div>
              <div className="grid gap-2"><Label>{t("cropDoctor.symptoms")}</Label>
                <Textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={4} placeholder={t("cropDoctor.symptomsPlaceholder")} maxLength={2000} />
              </div>
              <div className="grid gap-2">
                <Label>{t("cropDoctor.photoRequired")}</Label>
                <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} disabled={uploading} aria-invalid={!!imgError} />
                {imagePath && <p className="text-xs text-muted-foreground flex items-center gap-1"><Camera className="h-3 w-3" /> {t("cropDoctor.imageAttached")}</p>}
                {imgError && <p className="text-xs text-destructive">{imgError}</p>}
              </div>
              <Button type="submit" disabled={mut.isPending || uploading}>
                {mut.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> {t("cropDoctor.diagnosing")}</> : t("cropDoctor.diagnose")}
              </Button>
            </form>
            {fallback && (
              <div className="mt-4 rounded-lg border border-amber-300/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4" /><div>{fallback}</div></div>
              </div>
            )}
          </CardContent>
        </Card>

        {latest && <DiagnosisCard row={latest} title={t("cropDoctor.latestResult")} />}

        <h2 className="mt-10 text-lg font-semibold">{t("cropDoctor.history")}</h2>
        <div className="mt-3 space-y-3">
          {history.isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-24" />)}
          {history.data && history.data.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("cropDoctor.noHistory")}</p>
          )}
          {(history.data as DiagnosisRow[] | undefined)?.slice(1).map((d) => (
            <DiagnosisCard key={d.id} row={d} />
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}

function DiagnosisCard({ row, title }: { row: DiagnosisRow; title?: string }) {
  const { t } = useTranslation();
  const r = row.ai_result;
  return (
    <Card className={title ? "mt-6 border-primary/40" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{title ?? row.crop_name ?? t("cropDoctor.newDiagnosis")}</span>
          {r && <Badge variant="secondary">{t("cropDoctor.confidence", { pct: Math.round((r.confidence ?? 0) * 100) })}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="text-xs text-muted-foreground">{row.crop_name} · {new Date(row.created_at).toLocaleDateString()}</div>
        {r ? (
          <div className="grid gap-2">
            <Row k={t("cropDoctor.fields.disease")} v={r.disease_name} />
            <Row k={t("cropDoctor.fields.cause")} v={r.cause} />
            <Row k={t("cropDoctor.fields.organic")} v={r.organic_treatment} />
            <Row k={t("cropDoctor.fields.chemical")} v={r.chemical_treatment} />
            <Row k={t("cropDoctor.fields.dosage")} v={r.dosage} />
            <Row k={t("cropDoctor.fields.prevention")} v={r.prevention} />
          </div>
        ) : (
          <p className="text-muted-foreground">{t("cropDoctor.noResult")}</p>
        )}
      </CardContent>
    </Card>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div><span className="font-medium">{k}: </span><span className="text-muted-foreground">{v}</span></div>;
}
