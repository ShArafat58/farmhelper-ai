import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Coins, Loader2, ArrowUpDown, Trophy, AlertTriangle } from "lucide-react";

import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { COUNTRIES } from "@/lib/countries";
import { profitPlanner } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/profit-planner")({
  head: () => ({ meta: [{ title: "Profit Planner — FarmHelper" }] }),
  component: ProfitPage,
});

const AREA_UNITS = ["acre", "hectare", "bigha", "katha", "sqm"];
const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "INR", "BDT", "PKR", "NGN", "KES", "BRL", "ZAR", "IDR", "PHP", "MXN", "ARS"];

type Crop = {
  crop: string;
  est_cost: number;
  est_revenue: number;
  est_profit: number;
  demand: string;
  season_fit: string;
  notes: string;
};

function ProfitPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const fn = useServerFn(profitPlanner);

  const [country, setCountry] = useState(profile?.country ?? "US");
  const [region, setRegion] = useState(profile?.region ?? "");
  const [area, setArea] = useState("1");
  const [areaUnit, setAreaUnit] = useState(profile?.area_unit ?? "acre");
  const [currency, setCurrency] = useState(profile?.currency ?? "USD");
  const [sortKey, setSortKey] = useState<keyof Crop>("est_profit");
  const [sortAsc, setSortAsc] = useState(false);
  const [result, setResult] = useState<{ crops: Crop[]; currency: string; season: string } | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      setResult({ crops: r.crops, currency: r.currency, season: r.season });
      setFallback(null);
      toast.success(t("profit.ready"));
    },
    onError: (e: Error) => {
      setFallback(t("profit.fallback"));
      toast.error(e.message);
    },
  });

  const sorted = useMemo(() => {
    if (!result) return [];
    const arr = [...result.crops];
    arr.sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [result, sortKey, sortAsc]);

  const top = result?.crops.reduce<Crop | null>((best, c) => (!best || c.est_profit > best.est_profit ? c : best), null) ?? null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const a = Number(area);
    if (!Number.isFinite(a) || a <= 0) return toast.error(t("profit.areaPositive"));
    mut.mutate({
      data: {
        area: a,
        area_unit: areaUnit,
        country,
        region: region.trim() || null,
        currency,
        language: profile?.country === "BD" && profile?.preferred_language === "bn" ? "bn" : "en",
      },
    });
  }

  function toggleSort(k: keyof Crop) {
    if (sortKey === k) setSortAsc(!sortAsc);
    else { setSortKey(k); setSortAsc(false); }
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Coins className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Profit Planner</h1>
            <p className="text-sm text-muted-foreground">AI-ranked profitable crops for your land, region and season.</p>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader><CardTitle className="text-lg">Inputs</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Region (override)</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Region / state</Label>
                <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="optional" />
              </div>
              <div className="grid gap-2"><Label>Area</Label>
                <Input type="number" step="0.01" value={area} onChange={(e) => setArea(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Area unit</Label>
                <Select value={areaUnit} onValueChange={setAreaUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AREA_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COMMON_CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={mut.isPending} className="w-full">
                  {mut.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Planning…</> : "Plan profitable crops"}
                </Button>
              </div>
            </form>
            {fallback && (
              <div className="mt-3 rounded border border-amber-300/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertTriangle className="mr-1 inline h-4 w-4" />{fallback}
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{sorted.length} crops · season: {result.season} · currency: {result.currency}</p>
            </div>

            {top && (
              <Card className="mt-3 border-primary/50 bg-primary/5">
                <CardContent className="flex items-center gap-3 p-4">
                  <Trophy className="h-6 w-6 text-primary" />
                  <div className="flex-1">
                    <div className="font-semibold">Best profit: {top.crop}</div>
                    <div className="text-xs text-muted-foreground">{top.notes}</div>
                  </div>
                  <div className="text-right font-semibold">{top.est_profit.toLocaleString()} {result.currency}</div>
                </CardContent>
              </Card>
            )}

            <div className="mt-3 overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><button onClick={() => toggleSort("crop")} className="flex items-center gap-1">Crop <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                    <TableHead><button onClick={() => toggleSort("est_cost")} className="flex items-center gap-1">Cost <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                    <TableHead><button onClick={() => toggleSort("est_revenue")} className="flex items-center gap-1">Revenue <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                    <TableHead><button onClick={() => toggleSort("est_profit")} className="flex items-center gap-1">Profit <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                    <TableHead>Demand</TableHead>
                    <TableHead>Season fit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((c) => (
                    <TableRow key={c.crop} className={c.crop === top?.crop ? "bg-primary/5" : ""}>
                      <TableCell className="font-medium">{c.crop}</TableCell>
                      <TableCell>{Number(c.est_cost).toLocaleString()}</TableCell>
                      <TableCell>{Number(c.est_revenue).toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">{Number(c.est_profit).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline">{c.demand}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{c.season_fit}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
