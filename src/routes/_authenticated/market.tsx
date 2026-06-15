import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Phone, Flag, CheckCircle2, Store, LineChart, Sparkles, Loader2 } from "lucide-react";

import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  listPricesForRegion, listActiveListings, listMyListings,
  createListing, updateListing, deleteListing, markListingSold,
  revealContact, reportListing, getImageSignedUrl,
} from "@/lib/market.functions";
import { sellAdvisor } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/market")({
  head: () => ({ meta: [{ title: "Market — FarmHelper" }] }),
  component: MarketPage,
});

function MarketPage() {
  const { t } = useTranslation();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("market.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("market.subtitle")}</p>

        <Tabs defaultValue="prices" className="mt-6">
          <TabsList>
            <TabsTrigger value="prices"><LineChart className="mr-1 h-4 w-4" /> {t("market.tabs.prices")}</TabsTrigger>
            <TabsTrigger value="sell"><Store className="mr-1 h-4 w-4" /> {t("market.tabs.sell")}</TabsTrigger>
          </TabsList>
          <TabsContent value="prices" className="mt-4"><PricesTab /></TabsContent>
          <TabsContent value="sell" className="mt-4"><SellTab /></TabsContent>
        </Tabs>
      </section>
    </SiteLayout>
  );
}

/* ---------------- Prices ---------------- */

function PricesTab() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const fn = useServerFn(listPricesForRegion);
  const q = useQuery({
    queryKey: ["prices", profile?.country, profile?.region],
    enabled: !!profile,
    queryFn: () => fn({ data: { country: profile?.country ?? null, region: profile?.region ?? null } }),
  });

  type Row = { id: string; crop_name: string; price: number; currency: string; unit: string; as_of: string; region: string | null };
  const rows = (q.data ?? []) as Row[];
  const byCrop = new Map<string, Row[]>();
  rows.forEach((r) => {
    if (!byCrop.has(r.crop_name)) byCrop.set(r.crop_name, []);
    byCrop.get(r.crop_name)!.push(r);
  });
  const grouped = Array.from(byCrop.entries()).map(([crop, list]) => {
    const sorted = [...list].sort((a, b) => b.as_of.localeCompare(a.as_of));
    const latest = sorted[0];
    const prev = sorted[1];
    const trend = prev ? latest.price - prev.price : 0;
    return { crop, latest, trend };
  });

  return (
    <div>
      <p className="text-xs text-muted-foreground">
        {t("market.showingFor", {
          region: profile?.region ? `${profile.region}, ` : "",
          country: profile?.country ?? t("settings.region"),
        })}
      </p>
      <div className="mt-3 space-y-2">
        {q.isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}
        {q.isError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">{t("market.loadErrorPrices")}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => q.refetch()}>{t("common.retry")}</Button>
          </div>
        )}
        {q.data && grouped.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t("market.noPrices")}
          </div>
        )}
        {grouped.map(({ crop, latest, trend }) => (
          <PriceCard key={crop} crop={crop} latest={latest} trend={trend} />
        ))}
      </div>
    </div>
  );
}


type PriceRow = { id: string; crop_name: string; price: number; currency: string; unit: string; as_of: string; region: string | null };

function PriceCard({ crop, latest, trend }: { crop: string; latest: PriceRow; trend: number }) {
  const { profile } = useAuth();
  const adviseFn = useServerFn(sellAdvisor);
  const [open, setOpen] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask() {
    setOpen(true);
    if (advice) return;
    setLoading(true);
    try {
      const r = await adviseFn({
        data: {
          crop_name: crop,
          current_price: latest.price,
          unit: latest.unit,
          trend,
          country: profile?.country ?? null,
          region: latest.region ?? profile?.region ?? null,
          currency: latest.currency,
          language: profile?.country === "BD" && profile?.preferred_language === "bn" ? "bn" : "en",
        },
      });
      setAdvice(r.advice);
    } catch (e) {
      toast.error((e as Error).message);
      setAdvice("AI is unavailable. Please retry shortly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="font-medium">{crop}</div>
          <div className="text-xs text-muted-foreground">{latest.region ?? "—"} · as of {latest.as_of}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold">{latest.price} {latest.currency} <span className="text-xs text-muted-foreground">/ {latest.unit}</span></div>
          {trend !== 0 && (
            <div className={`text-xs ${trend > 0 ? "text-primary" : "text-destructive"}`}>
              {trend > 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(2)}
            </div>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={ask}>
              <Sparkles className="mr-1 h-3 w-3" /> Ask AI
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Sell or hold — {crop}?</DialogTitle></DialogHeader>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</div>
            ) : (
              <p className="whitespace-pre-wrap text-sm">{advice}</p>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/* ---------------- Sell / Listings ---------------- */

type Listing = {
  id: string; user_id: string; crop_name: string; qty: number; unit: string;
  price: number; currency: string; country: string | null; region: string | null;
  contact_phone: string; image_path: string | null; status: string; created_at: string;
};

function SellTab() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  const listFn = useServerFn(listActiveListings);
  const myFn = useServerFn(listMyListings);
  const createFn = useServerFn(createListing);
  const updateFn = useServerFn(updateListing);
  const delFn = useServerFn(deleteListing);
  const soldFn = useServerFn(markListingSold);

  const all = useQuery({ queryKey: ["listings"], queryFn: () => listFn() });
  const mine = useQuery({ queryKey: ["my-listings"], queryFn: () => myFn() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Listing | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["listings"] });
    qc.invalidateQueries({ queryKey: ["my-listings"] });
  };

  const create = useMutation({
    mutationFn: createFn,
    onSuccess: () => { invalidate(); toast.success("Listing posted"); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: updateFn,
    onSuccess: () => { invalidate(); toast.success("Listing updated"); setOpen(false); setEditing(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: delFn,
    onSuccess: () => { invalidate(); toast.success("Listing deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const sold = useMutation({
    mutationFn: soldFn,
    onSuccess: () => { invalidate(); toast.success("Marked sold"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Active listings</h2>
          <p className="text-xs text-muted-foreground">Sell direct. Contact details are revealed on request.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> New listing</Button></DialogTrigger>
          <ListingDialog
            initial={editing}
            defaults={{ country: profile?.country ?? "", region: profile?.region ?? "", currency: profile?.currency ?? "USD" }}
            userId={user?.id ?? ""}
            submitting={create.isPending || update.isPending}
            onSubmit={(values) => {
              if (editing) update.mutate({ data: { id: editing.id, ...values } });
              else create.mutate({ data: values });
            }}
          />
        </Dialog>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {all.isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)}
        {all.isError && (
          <div className="col-span-full rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">Could not load listings.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => all.refetch()}>Retry</Button>
          </div>
        )}
        {all.data && all.data.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed p-10 text-center">
            <Store className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No active listings yet — be the first to post.</p>
          </div>
        )}
        {(all.data as Listing[] | undefined)?.map((l) => (
          <ListingCard key={l.id} listing={l} isOwner={l.user_id === user?.id}
            onEdit={() => { setEditing(l); setOpen(true); }}
            onDelete={() => { if (confirm("Delete this listing?")) del.mutate({ data: { id: l.id } }); }}
            onSold={() => sold.mutate({ data: { id: l.id } })}
          />
        ))}
      </div>

      {mine.data && mine.data.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold">My listings</h2>
          <div className="mt-3 grid gap-2">
            {(mine.data as Listing[]).map((l) => (
              <Card key={l.id}>
                <CardContent className="flex items-center justify-between p-3 text-sm">
                  <span>{l.crop_name} · {l.qty} {l.unit} · {l.price} {l.currency}</span>
                  <Badge variant={l.status === "active" ? "default" : "secondary"}>{l.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ListingCard({
  listing, isOwner, onEdit, onDelete, onSold,
}: {
  listing: Listing; isOwner: boolean;
  onEdit: () => void; onDelete: () => void; onSold: () => void;
}) {
  const signedFn = useServerFn(getImageSignedUrl);
  const revealFn = useServerFn(revealContact);
  const reportFn = useServerFn(reportListing);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [contact, setContact] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    if (listing.image_path) {
      signedFn({ data: { path: listing.image_path } })
        .then((r) => { if (!cancel) setImgUrl(r.url); })
        .catch(() => {});
    }
    return () => { cancel = true; };
  }, [listing.image_path, signedFn]);

  async function reveal() {
    try {
      const r = await revealFn({ data: { listing_id: listing.id } });
      setContact(r.contact_phone);
      toast.success(`${r.remaining} reveals left today`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function report() {
    try {
      await reportFn({ data: { listing_id: listing.id, reason: null } });
      toast.success("Reported. Thanks — admins will review.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Card className="overflow-hidden">
      {imgUrl && <img src={imgUrl} alt={listing.crop_name} className="h-40 w-full object-cover" />}
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{listing.crop_name}</span>
          <span className="text-sm font-semibold">{listing.price} {listing.currency}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0 text-sm">
        <div className="text-muted-foreground">{listing.qty} {listing.unit} · {listing.region ?? listing.country ?? "—"}</div>
        {contact
          ? <div className="rounded bg-accent px-2 py-1 text-sm font-medium">{contact}</div>
          : <Button variant="outline" size="sm" onClick={reveal}><Phone className="mr-1 h-3 w-3" /> Reveal contact</Button>}
        <div className="flex flex-wrap gap-2 pt-1">
          {isOwner ? (
            <>
              <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="mr-1 h-3 w-3" /> Edit</Button>
              <Button variant="outline" size="sm" onClick={onSold}><CheckCircle2 className="mr-1 h-3 w-3" /> Sold</Button>
              <Button variant="outline" size="sm" onClick={onDelete}><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={report}><Flag className="mr-1 h-3 w-3" /> Report</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ListingDialog({
  initial, defaults, userId, submitting, onSubmit,
}: {
  initial: Listing | null;
  defaults: { country: string; region: string; currency: string };
  userId: string;
  submitting: boolean;
  onSubmit: (v: {
    crop_name: string; qty: number; unit: string; price: number; currency: string;
    country: string | null; region: string | null; contact_phone: string; image_path: string | null;
  }) => void;
}) {
  const [crop, setCrop] = useState(initial?.crop_name ?? "");
  const [qty, setQty] = useState(initial?.qty?.toString() ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "kg");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? defaults.currency);
  const [country, setCountry] = useState(initial?.country ?? defaults.country);
  const [region, setRegion] = useState(initial?.region ?? defaults.region);
  const [phone, setPhone] = useState(initial?.contact_phone ?? "");
  const [imagePath, setImagePath] = useState<string | null>(initial?.image_path ?? null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("JPG/PNG/WEBP only");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5 MB");
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/listings/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("farmhelper-images").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return toast.error(error.message);
    setImagePath(path);
    toast.success("Image uploaded");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const qn = Number(qty); const pn = Number(price);
    if (!crop.trim()) return setErr("Crop is required.");
    if (!Number.isFinite(qn) || qn <= 0) return setErr("Qty must be greater than 0.");
    if (!unit.trim()) return setErr("Unit is required.");
    if (!Number.isFinite(pn) || pn <= 0) return setErr("Price must be greater than 0.");
    if (!currency.trim()) return setErr("Currency is required.");
    if (phone.trim().length < 4) return setErr("Contact phone is required.");
    onSubmit({
      crop_name: crop.trim(), qty: qn, unit: unit.trim(), price: pn, currency: currency.trim().toUpperCase(),
      country: country.trim() ? country.trim().toUpperCase().slice(0, 2) : null,
      region: region.trim() || null,
      contact_phone: phone.trim(),
      image_path: imagePath,
    });
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{initial ? "Edit listing" : "New listing"}</DialogTitle></DialogHeader>
      <form className="space-y-3" onSubmit={submit}>
        <div className="grid gap-2"><Label>Crop</Label><Input value={crop} onChange={(e) => setCrop(e.target.value)} maxLength={80} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2"><Label>Qty</Label><Input type="number" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Unit</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={20} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2"><Label>Price</Label><Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Currency</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={8} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2"><Label>Country (ISO-2)</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={2} /></div>
          <div className="grid gap-2"><Label>Region</Label><Input value={region} onChange={(e) => setRegion(e.target.value)} maxLength={80} /></div>
        </div>
        <div className="grid gap-2"><Label>Contact phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} /></div>
        <div className="grid gap-2">
          <Label>Image (optional)</Label>
          <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} disabled={uploading} />
          {imagePath && <p className="text-xs text-muted-foreground">Image attached.</p>}
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <DialogFooter>
          <Button type="submit" disabled={submitting || uploading}>{submitting ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
