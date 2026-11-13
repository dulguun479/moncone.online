import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileSpreadsheet, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";

type ImportRow = { sku: string; barcode?: string; name: string; brand?: string; category: string; unit?: string; description?: string; image_url?: string; source_name?: string; source_url?: string; source_price_mnt?: number | null; sale_price_mnt?: number | null; stock_qty?: number; is_published?: boolean; image_usage_confirmed?: boolean; };
type ProductRow = { id: string; sku: string | null; name: string; brand: string | null; category: string; image_url: string | null; source_name: string | null; source_url: string | null; sale_price_mnt: number | null; image_usage_confirmed: boolean; is_published: boolean; };

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
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const parsed = useMemo(() => {
    const all = parseCsv(csv);
    if (all.length < 2) return { rows: [] as ImportRow[], errors: [] as string[] };
    const headers = all[0].map(h => h.toLowerCase().replace(/^\uFEFF/, ""));
    const at = (r: string[], key: string) => r[headers.indexOf(key)] ?? "";
    const errors: string[] = [];
    const rows = all.slice(1).map((r, i) => {
      const name = at(r, "name"); const sku = at(r, "sku"); const category = at(r, "category") || "Бусад";
      if (!name) errors.push((i + 2) + "-р мөр: name хоосон");
      if (!sku) errors.push((i + 2) + "-р мөр: sku хоосон");
      const price = num(at(r, "sale_price_mnt"));
      if (at(r, "sale_price_mnt") && (price === null || price < 0)) errors.push((i + 2) + "-р мөр: sale_price_mnt буруу");
      return { sku, barcode: at(r,"barcode") || undefined, name, brand: at(r,"brand") || undefined, category, unit: at(r,"unit") || undefined, description: at(r,"description") || undefined, image_url: at(r,"image_url") || undefined, source_name: at(r,"source_name") || undefined, source_url: at(r,"source_url") || undefined, source_price_mnt: num(at(r,"source_price_mnt")), sale_price_mnt: price, stock_qty: Math.max(0, Number(at(r,"stock_qty") || 0)) } as ImportRow;
    });
    return { rows, errors };
  }, [csv]);

  const refreshProducts = async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase.from("store_products").select("id,sku,name,brand,category,image_url,source_name,source_url,sale_price_mnt,image_usage_confirmed,is_published").order("created_at", { ascending: false }).limit(200);
    if (error) setMessage("Барааны жагсаалт ачаалсангүй: " + error.message);
    setProducts((data as ProductRow[]) ?? []);
    setLoadingProducts(false);
  };
  useEffect(() => { if (isAdmin) void refreshProducts(); }, [isAdmin]);

  const loadFile = async (file?: File) => { if (!file) return; setCsv(await file.text()); setMessage(file.name + " файлыг уншлаа."); };
  const importRows = async () => {
    if (!parsed.rows.length || parsed.errors.length) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("store_products").upsert(parsed.rows, { onConflict: "sku" });
    setBusy(false);
    setMessage(error ? "Импорт амжилтгүй: " + error.message : parsed.rows.length + " барааг ноорог төлөвт хадгаллаа.");
    if (!error) await refreshProducts();
  };
  const uploadProductImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setImageBusy(true); let done = 0; const errors: string[] = [];
    for (const file of Array.from(files)) {
      const sku = file.name.replace(/\.[^.]+$/, "");
      const product = products.find(p => p.sku === sku);
      if (!product) { errors.push(file.name + ": нэр нь SKU-тай таарсангүй"); continue; }
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = sku + "." + extension;
      const { error: uploadError } = await supabase.storage.from("store-product-images").upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) { errors.push(file.name + ": " + uploadError.message); continue; }
      const publicUrl = supabase.storage.from("store-product-images").getPublicUrl(path).data.publicUrl;
      const { error: updateError } = await supabase.from("store_products").update({ image_url: publicUrl, image_usage_confirmed: false }).eq("id", product.id);
      if (updateError) errors.push(file.name + ": " + updateError.message); else done++;
    }
    setImageBusy(false); setMessage(done + " зургийг холболоо." + (errors.length ? " Алдаа: " + errors.join("; ") : " Нийтлэхийн өмнө зургийн эрх болон үнийг шалгана уу."));
    await refreshProducts();
  };
  const confirmImageAndPublish = async (p: ProductRow) => {
    if (!p.image_url || p.sale_price_mnt === null || p.sale_price_mnt <= 0) { setMessage("Нийтлэхийн өмнө зураг болон зарах үнийг заавал оруулна."); return; }
    const { error } = await supabase.from("store_products").update({ image_usage_confirmed: true, is_published: true, source_checked_at: new Date().toISOString() }).eq("id", p.id);
    setMessage(error ? "Нийтэлж чадсангүй: " + error.message : p.name + " нийтлэгдлээ.");
    if (!error) await refreshProducts();
  };
  const unpublish = async (p: ProductRow) => {
    const { error } = await supabase.from("store_products").update({ is_published: false }).eq("id", p.id);
    setMessage(error ? error.message : p.name + " ноорог төлөвт шилжлээ.");
    if (!error) await refreshProducts();
  };
  const downloadTemplate = () => {
    const csvTemplate = "sku,name,category,brand,unit,barcode,description,image_url,source_name,source_url,source_price_mnt,sale_price_mnt,stock_qty\n";
    const url = URL.createObjectURL(new Blob(["\\uFEFF" + csvTemplate], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = "moncone-baraa-import-template.csv"; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="mx-auto max-w-5xl p-8">Уншиж байна...</div>;
  if (!isAdmin) return <div className="mx-auto max-w-5xl p-8">Энэ хэсэг зөвхөн админд нээлттэй.</div>;
  return <div className="mx-auto max-w-6xl px-4 py-8">
    <h1 className="text-2xl font-bold">Бараа бөөнөөр бүртгэх</h1>
    <p className="mt-2 text-sm text-muted-foreground">Excel-ээ CSV болгон хадгалаад олон барааг нэг дор импортлоно. Шинэ бараа автоматаар нийтлэгдэхгүй, эхлээд ноорогт орно.</p>
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 font-semibold"><FileSpreadsheet className="h-5 w-5 text-primary"/> CSV / Excel импорт</div><Button variant="outline" onClick={downloadTemplate}>CSV загвар татах</Button></div>
      <input type="file" accept=".csv,text/csv" onChange={e=>loadFile(e.target.files?.[0])} className="mt-4 block w-full text-sm"/>
      <p className="mt-3 text-xs text-muted-foreground">Баганууд: sku, name, category, brand, unit, barcode, description, image_url, source_name, source_url, source_price_mnt, sale_price_mnt, stock_qty</p>
      <div className="mt-4"><label className="mb-2 block text-sm font-medium">Эсвэл CSV текстээ хуулна уу</label><Textarea value={csv} onChange={e=>setCsv(e.target.value)} rows={8} placeholder={"sku,name,category,brand,unit,image_url,sale_price_mnt\nMILK-001,Сүү Цэвэр,Сүү цагаан идээ,Цэвэр,1л,https://...,5200"}/></div>
      <div className="mt-4 flex flex-wrap gap-3"><Button onClick={importRows} disabled={busy||!parsed.rows.length||parsed.errors.length>0}>{busy?"Оруулж байна...":"Ноорогт бөөнөөр хадгалах"}</Button><Button variant="outline" onClick={()=>void refreshProducts()}><RefreshCw className="mr-2 h-4 w-4"/>Жагсаалт шинэчлэх</Button></div>
      {csv && <div className="mt-5 rounded-xl bg-muted p-4"><p className="text-sm">Импортын мөр: {parsed.rows.length} · Алдаа: {parsed.errors.length}</p>{parsed.errors.length>0 && <ul className="mt-2 space-y-1 text-sm text-destructive">{parsed.errors.slice(0,20).map((e,i)=><li key={i}><AlertCircle className="mr-1 inline h-4 w-4"/>{e}</li>)}</ul>}{parsed.errors.length===0&&parsed.rows.length>0&&<p className="mt-2 text-sm text-green-600"><CheckCircle2 className="mr-1 inline h-4 w-4"/>Импортод бэлэн. Нийтлэхгүй, ноорог хадгална.</p>}</div>}
    </div>
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">Бодит барааны зураг бөөнөөр оруулах</h2>
      <p className="mt-2 text-sm text-muted-foreground">Зургийн файлын нэрийг тухайн барааны SKU-тай яг адил болгоно. Жишээ: MILK-001.jpg. Зөвхөн өөрийн авсан эсвэл нийлүүлэгчээс ашиглах зөвшөөрөлтэй зургийг оруулна.</p>
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={imageBusy} onChange={e=>void uploadProductImages(e.target.files)} className="mt-4 block w-full text-sm"/>
      {imageBusy && <p className="mt-2 text-sm text-muted-foreground">Зураг байршуулж байна...</p>}
    </div>
    <div className="mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Барааны хяналт ({products.length})</h2><span className="text-xs text-muted-foreground">Сүүлийн 200 бараа</span></div>
      {loadingProducts?<p className="py-8 text-center text-muted-foreground">Ачаалж байна...</p>:products.length===0?<p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Одоогоор бараа бүртгэгдээгүй байна.</p>:<div className="space-y-3">{products.map(p=><div key={p.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">{p.image_url?<img src={p.image_url} alt={p.name} className="h-full w-full object-contain"/>:<div className="flex h-full items-center justify-center text-xs text-muted-foreground">Зураггүй</div>}</div>
        <div className="min-w-0 flex-1"><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.brand||p.category} · SKU: {p.sku||"—"} · {p.sale_price_mnt==null?"Үнэ оруулаагүй":new Intl.NumberFormat("mn-MN").format(p.sale_price_mnt)+" ₮"}</p>{p.source_name&&<p className="mt-1 text-xs text-muted-foreground">Эх сурвалж: {p.source_name} {p.source_url&&<a href={p.source_url} target="_blank" rel="noreferrer" className="underline">эх сурвалж <ExternalLink className="inline h-3 w-3"/></a>}</p>}</div>
        {p.is_published?<Button variant="outline" onClick={()=>void unpublish(p)}>Нийтлэлээс буулгах</Button>:<Button disabled={!p.image_url||p.sale_price_mnt===null||p.sale_price_mnt<=0} onClick={()=>void confirmImageAndPublish(p)}>Зураг, үнийг шалгаад нийтлэх</Button>}
      </div>)}</div>}
    </div>
    <div className="mt-8 rounded-2xl border border-border p-5"><h2 className="font-semibold">Монголын барааны мэдээлэл цуглуулах эх сурвалж</h2><p className="mt-2 text-sm text-muted-foreground">Эдгээр эх сурвалжийн үнэ, барааны мэдээллийг тулгаж шалгана. Бусдын зураг, каталогийг ашиглах зөвшөөрөлгүйгээр нийтлэхгүй.</p><ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><li><a className="underline" href="https://www.onmart.mn/" target="_blank" rel="noreferrer">Onmart — өргөн хэрэглээний бараа</a></li><li><a className="underline" href="https://azimarket.mn/products" target="_blank" rel="noreferrer">Azi Market — хүнс, импортын бараа</a></li><li><a className="underline" href="https://www.aldimongolia.com/" target="_blank" rel="noreferrer">Алди Импорт — хүнсний импортлогч</a></li><li><a className="underline" href="https://mccfoods.mn/mn/" target="_blank" rel="noreferrer">MCC Foods — брэнд, дистрибьютор</a></li><li><a className="underline" href="https://hedve.mn/category/groceries" target="_blank" rel="noreferrer">Хэд вэ? — үнийн ажиглалт</a></li></ul></div>
    {message&&<p className="mt-4 rounded-xl bg-muted p-4 text-sm">{message}</p>}
  </div>;
}
