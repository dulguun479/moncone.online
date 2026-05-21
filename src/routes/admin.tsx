import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ChangeEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Crown, Pencil, Plus, Shield, Trash2, Users, DollarSign, Film,
  Megaphone, Image as ImageIcon, BarChart3, CreditCard, Loader2, CheckCircle2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { adminListPayments, adminConfirmPayment, adminUpdateSettings } from "@/lib/payments.functions";
import { adminListAds, adminUpsertAd, adminDeleteAd } from "@/lib/ads.functions";
import { sendBroadcast, broadcastNewMovie } from "@/lib/broadcast.functions";
import { adminFullStats } from "@/lib/stats.functions";

const ADMIN_EMAIL = "dolgoonoo473@gmail.com";

type Movie = {
  id: string;
  title: string | null; title_en: string | null;
  description: string | null; description_en: string | null;
  genre: string; year: number; duration_min: number | null;
  cast_list: string | null; director: string | null;
  poster_url: string | null; backdrop_url: string | null;
  video_url: string | null; r2_key: string | null;
  is_premium: boolean; is_featured: boolean;
  broadcast_sent?: boolean;
};

const emptyMovie: Partial<Movie> = {
  title: "", title_en: "", description: "", description_en: "",
  genre: "Drama", year: new Date().getFullYear(), duration_min: 90,
  cast_list: "", director: "", poster_url: "", backdrop_url: "", video_url: "",
  is_premium: false, is_featured: false,
};

export const Route = createFileRoute("/admin")({ component: Admin });

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const allowed = isAdmin || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    console.log("[Admin Debug]", {
      userEmail: user?.email,
      isAdmin,
      loading,
      allowed,
      ADMIN_EMAIL
    });
    if (loading) return;
    if (!user) {
      console.log("[Admin Debug] Redirecting to /login - No user session");
      navigate({ to: "/login" });
      return;
    }
    if (!allowed) {
      console.log("[Admin Debug] Redirecting to / - User is not admin or email mismatch");
      navigate({ to: "/" });
    }
  }, [user, allowed, loading, navigate]);

  if (!allowed) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold">Админ удирдлага</h1>
      </div>
      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="mb-6 flex flex-wrap">
          <TabsTrigger value="stats"><BarChart3 className="mr-2 h-4 w-4" /> Статистик</TabsTrigger>
          <TabsTrigger value="movies"><Film className="mr-2 h-4 w-4" /> Кино</TabsTrigger>
          <TabsTrigger value="payments"><CreditCard className="mr-2 h-4 w-4" /> Төлбөр</TabsTrigger>
          <TabsTrigger value="broadcast"><Megaphone className="mr-2 h-4 w-4" /> Мэдэгдэл</TabsTrigger>
          <TabsTrigger value="ads"><ImageIcon className="mr-2 h-4 w-4" /> Зар</TabsTrigger>
          <TabsTrigger value="settings">Тохиргоо</TabsTrigger>
        </TabsList>
        <TabsContent value="stats"><StatsTab /></TabsContent>
        <TabsContent value="movies"><MoviesTab /></TabsContent>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
        <TabsContent value="broadcast"><BroadcastTab /></TabsContent>
        <TabsContent value="ads"><AdsTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Stats ---------------- */
function StatsTab() {
  const fn = useServerFn(adminFullStats);
  const [s, setS] = useState<{ users: number; premium: number; todayRevenue: number; monthRevenue: number; chart: { date: string; amount: number }[] } | null>(null);
  useEffect(() => { fn().then(setS).catch(() => {}); }, [fn]);
  if (!s) return <p className="text-muted-foreground">Уншиж байна...</p>;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Нийт хэрэглэгч" value={s.users} />
        <StatCard icon={<Crown className="h-5 w-5" />} label="Premium" value={s.premium} />
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="Өнөөдрийн орлого" value={`₮${s.todayRevenue.toLocaleString()}`} />
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="Сарын орлого" value={`₮${s.monthRevenue.toLocaleString()}`} />
      </div>
      <div className="rounded-lg border border-border/60 bg-card p-5">
        <h3 className="mb-4 font-semibold">Сүүлийн 30 хоногийн орлого</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <LineChart data={s.chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Movies ---------------- */
function MoviesTab() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Movie> | null>(null);
  const [notify, setNotify] = useState(true);
  const broadcastFn = useServerFn(broadcastNewMovie);

  const load = async () => {
    const { data } = await supabase.from("movies").select("*").order("created_at", { ascending: false });
    setMovies((data as Movie[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing || !editing.title || !editing.genre || !editing.year) {
      toast.error("Гарчиг, төрөл, он шаардлагатай"); return;
    }
    const { id, broadcast_sent: _bs, ...rest } = editing as Movie;
    const payload = {
      ...rest,
      title: String(rest.title ?? ""),
      genre: String(rest.genre ?? "Drama"),
      year: Number(rest.year ?? new Date().getFullYear()),
    };
    let error: { message: string } | null = null;
    let newId: string | undefined = id;
    if (id) {
      ({ error } = await supabase.from("movies").update(payload).eq("id", id));
    } else {
      const { data, error: e } = await supabase.from("movies").insert(payload).select("id").single();
      error = e; newId = data?.id;
    }
    if (error) { toast.error(error.message); return; }
    toast.success("Хадгаллаа");
    if (!id && newId && notify) {
      try {
        const r = await broadcastFn({ data: { movieId: newId } });
        toast.success(`Telegram: ${r.sent}/${r.total} хэрэглэгчид илгээгдлээ`);
      } catch (e) { toast.error((e as Error).message); }
    }
    setOpen(false); setEditing(null); load();
  };

  const del = async (id: string) => {
    if (!confirm("Устгах уу?")) return;
    const { error } = await supabase.from("movies").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Устгалаа"); load(); }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Кино ({movies.length})</h2>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(emptyMovie); setNotify(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Шинэ кино
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader><DialogTitle>{(editing as Movie)?.id ? "Кино засах" : "Шинэ кино"}</DialogTitle></DialogHeader>
            {editing && <MovieForm value={editing} onChange={setEditing} />}
            {!(editing as Movie)?.id && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={notify} onCheckedChange={(v) => setNotify(v === true)} />
                Telegram-аар бүх хэрэглэгчид мэдэгдэх
              </label>
            )}
            <DialogFooter><Button onClick={save}>Хадгалах</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-hidden rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-2">Гарчиг</th><th className="px-4 py-2">Төрөл</th><th className="px-4 py-2">Он</th><th className="px-4 py-2">Эрх</th><th /></tr>
          </thead>
          <tbody>
            {movies.map((m) => (
              <tr key={m.id} className="border-t border-border/40">
                <td className="px-4 py-2 font-medium">{m.title}</td>
                <td className="px-4 py-2 text-muted-foreground">{m.genre}</td>
                <td className="px-4 py-2 text-muted-foreground">{m.year}</td>
                <td className="px-4 py-2">{m.is_premium ? <Badge variant="default" className="gap-1"><Crown className="h-3 w-3" /> Premium</Badge> : <Badge variant="outline">Үнэгүй</Badge>}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(m); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MovieForm({ value, onChange }: { value: Partial<Movie>; onChange: (m: Partial<Movie>) => void }) {
  const set = (k: keyof Movie, v: unknown) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Гарчиг (MN)"><Input value={value.title ?? ""} onChange={(e) => set("title", e.target.value)} /></Field>
      <Field label="Title (EN)"><Input value={value.title_en ?? ""} onChange={(e) => set("title_en", e.target.value)} /></Field>
      <Field label="Төрөл"><Input value={value.genre ?? ""} onChange={(e) => set("genre", e.target.value)} /></Field>
      <Field label="Он"><Input type="number" value={value.year ?? 0} onChange={(e) => set("year", Number(e.target.value))} /></Field>
      <Field label="Үргэлжлэх (мин)"><Input type="number" value={value.duration_min ?? 0} onChange={(e) => set("duration_min", Number(e.target.value))} /></Field>
      <Field label="Найруулагч"><Input value={value.director ?? ""} onChange={(e) => set("director", e.target.value)} /></Field>
      <Field label="Жүжигчид" className="sm:col-span-2"><Input value={value.cast_list ?? ""} onChange={(e) => set("cast_list", e.target.value)} /></Field>

      <Field label="Постер зураг" className="sm:col-span-2">
        <UploadField kind="poster" accept="image/*" value={value.poster_url ?? ""} onChange={(url) => set("poster_url", url)} />
      </Field>
      <Field label="Backdrop зураг" className="sm:col-span-2">
        <UploadField kind="backdrop" accept="image/*" value={value.backdrop_url ?? ""} onChange={(url) => set("backdrop_url", url)} />
      </Field>
      <Field label="Видео файл (R2)" className="sm:col-span-2">
        <UploadField kind="video" accept="video/*" value={value.video_url ?? ""} onChange={(url) => set("video_url", url)} />
      </Field>

      <Field label="Тайлбар (MN)" className="sm:col-span-2"><Textarea value={value.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>
      <Field label="Description (EN)" className="sm:col-span-2"><Textarea value={value.description_en ?? ""} onChange={(e) => set("description_en", e.target.value)} /></Field>
      <div className="flex items-center gap-2"><Switch checked={!!value.is_premium} onCheckedChange={(c) => set("is_premium", c)} /><Label>Premium</Label></div>
      <div className="flex items-center gap-2"><Switch checked={!!value.is_featured} onCheckedChange={(c) => set("is_featured", c)} /><Label>Онцлох</Label></div>
    </div>
  );
}

function UploadField({ kind, accept, value, onChange }: { kind: "video" | "poster" | "backdrop" | "ad"; accept: string; value: string; onChange: (url: string) => void }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setProgress(0);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Та нэвтрэх шаардлагатай");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);

      const publicUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/public/upload");
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.publicUrl) resolve(res.publicUrl);
              else reject(new Error(res.error || "Файл хуулахад алдаа гарлаа"));
            } catch (e) {
              reject(new Error("Серверээс ирсэн мэдээллийг уншиж чадсангүй"));
            }
          } else {
            try {
              const res = JSON.parse(xhr.responseText);
              reject(new Error(res.error || `Серверийн алдаа: HTTP ${xhr.status}`));
            } catch (e) {
              reject(new Error(`Серверийн алдаа: HTTP ${xhr.status}`));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Сүлжээний холболтын алдаа гарлаа"));
        xhr.send(formData);
      });

      onChange(publicUrl);
      toast.success("Файлыг амжилттай хууллаа");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://... эсвэл доороос файл сонгоно уу" />
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm hover:bg-secondary/80">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {progress !== null ? `${progress}%` : "Файл сонгох"}
          <input type="file" accept={accept} className="hidden" onChange={onFile} disabled={uploading} />
        </label>
      </div>
      {value && accept.startsWith("image") && <img src={value} alt="" className="h-20 rounded border border-border/60 object-cover" />}
    </div>
  );
}

/* ---------------- Payments ---------------- */
function PaymentsTab() {
  const list = useServerFn(adminListPayments);
  const confirmFn = useServerFn(adminConfirmPayment);
  const [items, setItems] = useState<Array<{ id: string; payment_code: string; amount: number; status: string; created_at: string; email: string | null }>>([]);
  const reload = () => list().then((r) => setItems(r.payments as unknown as typeof items));
  useEffect(() => { reload(); }, []);

  const confirm = async (id: string) => {
    try { await confirmFn({ data: { paymentId: id } }); toast.success("Баталгаажлаа"); reload(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const pending = items.filter((p) => p.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-xl font-semibold">Хүлээгдэж байгаа ({pending.length})</h2>
        {pending.length === 0 && <p className="text-muted-foreground">Хүлээгдэж байгаа төлбөр алга.</p>}
        <div className="grid gap-3">
          {pending.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card p-4">
              <div>
                <p className="font-mono font-semibold">{p.payment_code}</p>
                <p className="text-sm text-muted-foreground">{p.email} · ₮{p.amount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("mn-MN")}</p>
              </div>
              <Button onClick={() => confirm(p.id)} className="gap-2"><CheckCircle2 className="h-4 w-4" /> Баталгаажуулах</Button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-xl font-semibold">Бүх төлбөр</h2>
        <div className="overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-2">Код</th><th className="px-4 py-2">Хэрэглэгч</th><th className="px-4 py-2">Дүн</th><th className="px-4 py-2">Төлөв</th><th className="px-4 py-2">Огноо</th></tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-border/40">
                  <td className="px-4 py-2 font-mono">{p.payment_code}</td>
                  <td className="px-4 py-2">{p.email}</td>
                  <td className="px-4 py-2">₮{p.amount.toLocaleString()}</td>
                  <td className="px-4 py-2"><Badge variant={p.status === "confirmed" ? "default" : "outline"}>{p.status}</Badge></td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(p.created_at).toLocaleDateString("mn-MN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Broadcast ---------------- */
function BroadcastTab() {
  const send = useServerFn(sendBroadcast);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const onSend = async () => {
    if (!msg.trim()) { toast.error("Мессеж бичнэ үү"); return; }
    if (!confirm(`Бүх Telegram-д холбогдсон хэрэглэгчид илгээх үү?`)) return;
    setSending(true);
    try {
      const r = await send({ data: { message: msg } });
      toast.success(`${r.sent}/${r.total} илгээгдлээ`);
      setMsg("");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSending(false); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-xl font-semibold">Push мэдэгдэл (Telegram)</h2>
      <p className="text-sm text-muted-foreground">Telegram бот руу холбогдсон бүх хэрэглэгчид мессеж очно. HTML дэмжигдэнэ (&lt;b&gt;, &lt;i&gt;, &lt;a&gt;).</p>
      <Textarea rows={6} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Жишээ нь: 🎬 Энэ долоо хоногт шинэ кино нэмэгдэх болно!" />
      <Button onClick={onSend} disabled={sending} className="gap-2">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} Илгээх
      </Button>
    </div>
  );
}

/* ---------------- Ads ---------------- */
type Ad = {
  id: string; title: string; image_url: string; link_url: string;
  placements: string[]; is_active: boolean; click_count: number;
  starts_at: string | null; ends_at: string | null;
};

function AdsTab() {
  const list = useServerFn(adminListAds);
  const upsert = useServerFn(adminUpsertAd);
  const del = useServerFn(adminDeleteAd);
  const [ads, setAds] = useState<Ad[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Ad> | null>(null);

  const reload = () => list().then((r) => setAds(r.ads as Ad[]));
  useEffect(() => { reload(); }, []);

  const save = async () => {
    if (!editing?.title || !editing.image_url || !editing.link_url || !(editing.placements?.length)) {
      toast.error("Бүх талбарыг бөглөнө үү"); return;
    }
    try {
      await upsert({ data: {
        id: editing.id,
        data: {
          title: editing.title,
          image_url: editing.image_url,
          link_url: editing.link_url,
          placements: editing.placements as ("home"|"movie"|"plans"|"profile")[],
          is_active: editing.is_active ?? true,
          starts_at: editing.starts_at ?? null,
          ends_at: editing.ends_at ?? null,
        },
      }});
      toast.success("Хадгаллаа"); setOpen(false); setEditing(null); reload();
    } catch (e) { toast.error((e as Error).message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Устгах уу?")) return;
    try { await del({ data: { id } }); toast.success("Устгалаа"); reload(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Зар ({ads.length})</h2>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ placements: ["home"], is_active: true })} className="gap-2"><Plus className="h-4 w-4" /> Шинэ зар</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
            <DialogHeader><DialogTitle>{editing?.id ? "Зар засах" : "Шинэ зар"}</DialogTitle></DialogHeader>
            {editing && <AdForm value={editing} onChange={setEditing} />}
            <DialogFooter><Button onClick={save}>Хадгалах</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ads.map((a) => (
          <div key={a.id} className="overflow-hidden rounded-lg border border-border/60 bg-card">
            <img src={a.image_url} alt={a.title} className="h-32 w-full object-cover" />
            <div className="space-y-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium">{a.title}</p>
                {a.is_active ? <Badge>Идэвхтэй</Badge> : <Badge variant="outline">Идэвхгүй</Badge>}
              </div>
              <p className="truncate text-xs text-muted-foreground">{a.link_url}</p>
              <div className="flex flex-wrap gap-1">
                {a.placements.map((p) => <Badge key={p} variant="secondary">{p}</Badge>)}
              </div>
              <p className="text-xs text-muted-foreground">Дарагдсан: <b>{a.click_count}</b></p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="mr-1 h-3 w-3" /> Засах</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdForm({ value, onChange }: { value: Partial<Ad>; onChange: (a: Partial<Ad>) => void }) {
  const placements: ("home"|"movie"|"plans"|"profile")[] = ["home", "movie", "plans", "profile"];
  const toggle = (p: string) => {
    const cur = value.placements ?? [];
    onChange({ ...value, placements: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p] });
  };
  return (
    <div className="space-y-3">
      <Field label="Гарчиг"><Input value={value.title ?? ""} onChange={(e) => onChange({ ...value, title: e.target.value })} /></Field>
      <Field label="Зураг (banner)">
        <UploadField kind="ad" accept="image/*" value={value.image_url ?? ""} onChange={(url) => onChange({ ...value, image_url: url })} />
      </Field>
      <Field label="Линк (URL)"><Input value={value.link_url ?? ""} onChange={(e) => onChange({ ...value, link_url: e.target.value })} placeholder="https://" /></Field>
      <Field label="Хаана харагдах">
        <div className="flex flex-wrap gap-3">
          {placements.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <Checkbox checked={(value.placements ?? []).includes(p)} onCheckedChange={() => toggle(p)} /> {p}
            </label>
          ))}
        </div>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Эхлэх (заавал биш)"><Input type="datetime-local" value={value.starts_at?.slice(0,16) ?? ""} onChange={(e) => onChange({ ...value, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
        <Field label="Дуусах (заавал биш)"><Input type="datetime-local" value={value.ends_at?.slice(0,16) ?? ""} onChange={(e) => onChange({ ...value, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
      </div>
      <label className="flex items-center gap-2"><Switch checked={value.is_active ?? true} onCheckedChange={(c) => onChange({ ...value, is_active: c })} /> Идэвхтэй</label>
    </div>
  );
}

/* ---------------- Settings ---------------- */
function SettingsTab() {
  const update = useServerFn(adminUpdateSettings);
  const [s, setS] = useState<{ bank_name: string; bank_account_number: string; bank_account_name: string; premium_price: number; telegram_bot_username: string; admin_telegram_chat_id: number | null } | null>(null);
  useEffect(() => {
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => setS(data as typeof s));
  }, []);
  if (!s) return null;
  const save = async () => {
    try {
      await update({ data: {
        bank_name: s.bank_name, bank_account_number: s.bank_account_number, bank_account_name: s.bank_account_name,
        premium_price: Number(s.premium_price), telegram_bot_username: s.telegram_bot_username,
        admin_telegram_chat_id: s.admin_telegram_chat_id ? Number(s.admin_telegram_chat_id) : null,
      }});
      toast.success("Хадгаллаа");
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div className="max-w-xl space-y-3">
      <Field label="Банк"><Input value={s.bank_name} onChange={(e) => setS({ ...s, bank_name: e.target.value })} /></Field>
      <Field label="Дансны дугаар"><Input value={s.bank_account_number} onChange={(e) => setS({ ...s, bank_account_number: e.target.value })} /></Field>
      <Field label="Хүлээн авагч"><Input value={s.bank_account_name} onChange={(e) => setS({ ...s, bank_account_name: e.target.value })} /></Field>
      <Field label="Premium үнэ (₮/сар)"><Input type="number" value={s.premium_price} onChange={(e) => setS({ ...s, premium_price: Number(e.target.value) })} /></Field>
      <Field label="Telegram bot username"><Input value={s.telegram_bot_username} onChange={(e) => setS({ ...s, telegram_bot_username: e.target.value })} /></Field>
      <Field label="Админ Telegram chat ID"><Input type="number" value={s.admin_telegram_chat_id ?? ""} onChange={(e) => setS({ ...s, admin_telegram_chat_id: e.target.value ? Number(e.target.value) : null })} /></Field>
      <Button onClick={save}>Хадгалах</Button>
    </div>
  );
}

/* ---------------- shared ---------------- */
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1.5 ${className ?? ""}`}><Label className="text-xs">{label}</Label>{children}</div>;
}
