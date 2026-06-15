import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
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

  const mut = useMutation({
    mutationFn: diagFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diagnoses"] });
      toast.success("Diagnosis ready");
      setFallback(null);
    },
    onError: (e: Error) => {
      setFallback(
        `We couldn't reach the AI right now. General guidance for ${crop || "your crop"}: inspect leaves daily, remove infected parts, water in the morning, and avoid overhead irrigation. Please retry.`,
      );
      toast.error(e.message);
    },
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("JPG/PNG/WEBP only");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5 MB");
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/diagnoses/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("farmhelper-images").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return toast.error(error.message);
    setImagePath(path);
    toast.success("Image attached");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!crop.trim() || symptoms.trim().length < 3) {
      toast.error("Add crop name and a few words about the symptoms.");
      return;
    }
    if (!imagePath) {
      toast.error("Please attach a photo of the crop to diagnose");
      return;
    }
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
            <h1 className="text-3xl font-bold tracking-tight">Crop Doctor</h1>
            <p className="text-sm text-muted-foreground">Describe symptoms (optionally add a photo) and get AI guidance.</p>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader><CardTitle className="text-lg">New diagnosis</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-2"><Label>Crop name</Label>
                <Input value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="e.g. Tomato, Rice" maxLength={80} />
              </div>
              <div className="grid gap-2"><Label>Symptoms</Label>
                <Textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={4} placeholder="Yellow spots on leaves, wilting…" maxLength={2000} />
              </div>
              <div className="grid gap-2">
                <Label>Photo (optional)</Label>
                <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} disabled={uploading} />
                {imagePath && <p className="text-xs text-muted-foreground flex items-center gap-1"><Camera className="h-3 w-3" /> Image attached</p>}
              </div>
              <Button type="submit" disabled={mut.isPending || uploading}>
                {mut.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Diagnosing…</> : "Diagnose"}
              </Button>
            </form>
            {fallback && (
              <div className="mt-4 rounded-lg border border-amber-300/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4" /><div>{fallback}</div></div>
              </div>
            )}
          </CardContent>
        </Card>

        {latest && <DiagnosisCard row={latest} title="Latest result" />}

        <h2 className="mt-10 text-lg font-semibold">History</h2>
        <div className="mt-3 space-y-3">
          {history.isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-24" />)}
          {history.data && history.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No diagnoses yet.</p>
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
  const r = row.ai_result;
  return (
    <Card className={title ? "mt-6 border-primary/40" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{title ?? row.crop_name ?? "Diagnosis"}</span>
          {r && <Badge variant="secondary">{Math.round((r.confidence ?? 0) * 100)}% confidence</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="text-xs text-muted-foreground">{row.crop_name} · {new Date(row.created_at).toLocaleDateString()}</div>
        {r ? (
          <div className="grid gap-2">
            <Row k="Disease" v={r.disease_name} />
            <Row k="Cause" v={r.cause} />
            <Row k="Organic treatment" v={r.organic_treatment} />
            <Row k="Chemical treatment" v={r.chemical_treatment} />
            <Row k="Dosage" v={r.dosage} />
            <Row k="Prevention" v={r.prevention} />
          </div>
        ) : (
          <p className="text-muted-foreground">No AI result saved.</p>
        )}
      </CardContent>
    </Card>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div><span className="font-medium">{k}: </span><span className="text-muted-foreground">{v}</span></div>;
}
