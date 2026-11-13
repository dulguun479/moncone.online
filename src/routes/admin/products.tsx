import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";

type ImportRow = { sku: string; barcode?: string; name: string; brand?: string; category: string; unit?: string; description?: string; image_url?: string; source_name?: string; source_url?: string; source_price_mnt?: number | null; sale_price_mnt?: number | null; stock_qty?: number; is_published?: boolean; image_usage_confirmed?: boolean; };

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell.trim()); if (row.some(v => v)) rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  row.push(cell.trim()); if (row.some(v => v)) rows.push(row); return rows;
}
function num(v?: string) { if (!v?.trim()) return null; const n = Number(v.replace(/[₮,\s]/g, "")); return Number.isFinite(n) ? n : null; }

export const Route = createFileRoute("/admin/products")({ component: ProductImportAdmin });

function ProductImportAdmin() {
  const { isAdmin, loading } = useAuth();
  const [csv, setCsv] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => {
    const all = parseCsv(csv);
    if (all.length < 2) return { rows: [] as ImportRow[], errors: [] as string[] };
    const headers = all[0].map(h => h.toLowerCase().replace(/^\uFEFF/, ""));
    const at = (r: string[], key: string) => r[headers.indexOf(key)] ?? "";
    const errors: string[] = [];
    const rows = all.slice(1).map((r, i) => {
      const name = at(r, "name"); const sku = at(r, "sku"); const category = at(r, "category") || "Бусад";
      if (!name) errors.push((i + 2) + "-р мөр: name хоосон");
      if (!sku) errors.push((i + 2) + "-р мөр: SKU хоосон");
      return { sku, barcode: at(r,"barcode") || undefined, name, brand: at(r,"brand") || undefined, category, unit: at(r,"unit") || undefined, description: at(r,"description") || undefined, image_url: at(r,"image_url") || undefined, source_name: at(r,"source_name") || undefined, source_url: at(r,"source_url") || undefined, source_price_mnt: num(at(r,"source_price_mnt")), sale_price_mnt: num(at(r,"sale_price_mnt")), stock_qty: Math.max(0, Number(at(r,"stock_qty") || 0)), is_published: false, image_usage_confirmed: false } as ImportRow;
    });
    return { rows, errors };
  }, [csv]);

  const loadFile = async (file?: File) => { if (!file) return; setCsv(await file.text()); setMessage(file.name + " файлыг уншлаа."); };
  const importRows = async () => {
    if (!parsed.rows.length || parsed.errors.length) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("store_products").upsert(parsed.rows, { onConflict: "sku" });
    setBusy(false);
    setMessage(error ? "Импорт амжилтгүй: " + error.message : parsed.rows.length + " барааг ноорог төлөвт хадгаллаа. Нийтлэхээс өмнө зураг, үнэ, зөвшөөрлийг шалгана уу.");
  };

  if (loading) return <div className="mx-auto max-w-4xl p-8">Уншиж байна...</div>;
  if (!isAdmin) return <div className="mx-auto max-w-4xl p-8">Энэ хэсэг зөвхөн админд нээлттэй.</div>;

  return <div className="mx-auto max-w-5xl px-4 py-8">
    <h1 className="text-2xl font-bold">Бараа бөөнөөр бүртгэх</h1>
    <p className="mt-2 text-sm text-muted-foreground">Excel-ээс CSV болгон хадгалаад нэг дор оруулна. Импортолсон бараа эхлээд ноорогт хадгалагдана — автоматаар нийтлэгдэхгүй.</p>
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 font-semibold"><FileSpreadsheet className="h-5 w-5 text-primary" /> CSV файл сонгох</div>
      <input type="file" accept=".csv,text/csv" onChange={e => loadFile(e.target.files?.[0])} className="mt-4 block w-full text-sm" />
      <p className="mt-3 text-xs text-muted-foreground">Баганууд: sku, name, category, brand, unit, barcode, description, image_url, source_name, source_url, source_price_mnt, sale_price_mnt, stock_qty</p>
      <div className="mt-4"><label className="mb-2 block text-sm font-medium">Эсвэл CSV текстээ энд хуулна уу</label><Textarea value={csv} onChange={e => setCsv(e.target.value)} rows={8} placeholder={'sku,name,category,brand,unit,image_url,sale_price_mnt\nMILK-001,Сүү,Сүү цагаан идээ,Цэвэр,1л,https://...,5200'} /></div>
      <div className="mt-4 flex flex-wrap gap-3"><Button variant="outline" onClick={() => setCsv("sku,name,category,brand,unit,barcode,description,image_url,source_name,source_url,source_price_mnt,sale_price_mnt,stock_qty\nMILK-001,Сүү Цэвэр,Сүү цагаан идээ,Цэвэр,1000мл,,,,, ,5200,0")}>Жишээ загвар</Button><Button onClick={importRows} disabled={busy || !parsed.rows.length || parsed.errors.length > 0}>{busy ? "Оруулж байна..." : "Ноорогт бөөнөөр хадгалах"}</Button></div>
    </div>
    {csv && <div className="mt-6 rounded-2xl border border-border p-5"><h2 className="font-semibold">Импортын шалгалт</h2><p className="mt-2 text-sm">Нийт мөр: {parsed.rows.length} · Алдаа: {parsed.errors.length}</p>{parsed.errors.length > 0 && <ul className="mt-3 space-y-1 text-sm text-destructive">{parsed.errors.slice(0,20).map((e,i)=><li key={i}><AlertCircle className="mr-1 inline h-4 w-4"/>{e}</li>)}</ul>}{parsed.errors.length===0 && parsed.rows.length>0 && <p className="mt-3 text-sm text-green-600"><CheckCircle2 className="mr-1 inline h-4 w-4"/>Импортод бэлэн. Нийтлэхгүй, зөвхөн ноорог хадгална.</p>}</div>}
    {message && <p className="mt-4 rounded-xl bg-muted p-4 text-sm">{message}</p>}
  </div>;
}
