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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Crown,
  Pencil,
  Plus,
  Shield,
  Trash2,
  Users,
  DollarSign,
  Film,
  Megaphone,
  Image as ImageIcon,
  BarChart3,
  CreditCard,
  Loader2,
  CheckCircle2,
  Play,
  Copy,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  adminListPayments,
  adminConfirmPayment,
  adminUpdateSettings,
  adminListUsers,
  adminUpdateUserSubscription,
} from "@/lib/payments.functions";
import { adminListAds, adminUpsertAd, adminDeleteAd } from "@/lib/ads.functions";
import { sendBroadcast, broadcastNewMovie } from "@/lib/broadcast.functions";
import { adminFullStats } from "@/lib/stats.functions";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || (typeof process !== "undefined" ? process.env.ADMIN_EMAIL : "") || "dolgoonoo473@gmail.com";

type Movie = {
  id: string;
  title: string | null;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  genre: string;
  year: number;
  duration_min: number | null;
  cast_list: string | null;
  director: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  video_url: string | null;
  r2_key: string | null;
  is_premium: boolean;
  is_featured: boolean;
  broadcast_sent?: boolean;
};

const emptyMovie: Partial<Movie> = {
  title: "",
  title_en: "",
  description: "",
  description_en: "",
  genre: "Drama",
  year: new Date().getFullYear(),
  duration_min: 90,
  cast_list: "",
  director: "",
  poster_url: "",
  backdrop_url: "",
  video_url: "",
  is_premium: false,
  is_featured: false,
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
      ADMIN_EMAIL,
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
          <TabsTrigger value="stats">
            <BarChart3 className="mr-2 h-4 w-4" /> Статистик
          </TabsTrigger>
          <TabsTrigger value="movies">
            <Film className="mr-2 h-4 w-4" /> Кино
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="mr-2 h-4 w-4" /> Төлбөр
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" /> Хэрэглэгчид
          </TabsTrigger>
          <TabsTrigger value="broadcast">
            <Megaphone className="mr-2 h-4 w-4" /> Мэдэгдэл
          </TabsTrigger>
          <TabsTrigger value="ads">
            <ImageIcon className="mr-2 h-4 w-4" /> Зар
          </TabsTrigger>
          <TabsTrigger value="transcoder">
            <Loader2 className="mr-2 h-4 w-4 text-emerald-400 animate-pulse" /> HLS Студи
          </TabsTrigger>
          <TabsTrigger value="settings">Тохиргоо</TabsTrigger>
        </TabsList>
        <TabsContent value="stats">
          <StatsTab />
        </TabsContent>
        <TabsContent value="movies">
          <MoviesTab />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="broadcast">
          <BroadcastTab />
        </TabsContent>
        <TabsContent value="ads">
          <AdsTab />
        </TabsContent>
        <TabsContent value="transcoder">
          <TranscoderTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Stats ---------------- */
function StatsTab() {
  const fn = useServerFn(adminFullStats);
  const [s, setS] = useState<{
    users: number;
    premium: number;
    todayRevenue: number;
    monthRevenue: number;
    chart: { date: string; amount: number }[];
  } | null>(null);
  useEffect(() => {
    fn()
      .then(setS)
      .catch(() => {});
  }, [fn]);
  if (!s) return <p className="text-muted-foreground">Уншиж байна...</p>;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Нийт хэрэглэгч" value={s.users} />
        <StatCard icon={<Crown className="h-5 w-5" />} label="Premium" value={s.premium} />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Өнөөдрийн орлого"
          value={`₮${s.todayRevenue.toLocaleString()}`}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Сарын орлого"
          value={`₮${s.monthRevenue.toLocaleString()}`}
        />
      </div>
      <div className="rounded-lg border border-border/60 bg-card p-5">
        <h3 className="mb-4 font-semibold">Сүүлийн 30 хоногийн орлого</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <LineChart data={s.chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
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
    const { data } = await supabase
      .from("movies")
      .select("*")
      .order("created_at", { ascending: false });
    setMovies((data as Movie[]) ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing || !editing.title || !editing.genre || !editing.year) {
      toast.error("Гарчиг, төрөл, он шаардлагатай");
      return;
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
      const { data, error: e } = await supabase
        .from("movies")
        .insert(payload)
        .select("id")
        .single();
      error = e;
      newId = data?.id;
    }
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Хадгаллаа");
    if (!id && newId && notify) {
      try {
        const r = await broadcastFn({ data: { movieId: newId } });
        toast.success(`Telegram: ${r.sent}/${r.total} хэрэглэгчид илгээгдлээ`);
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
    setOpen(false);
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Устгах уу?")) return;
    const { error } = await supabase.from("movies").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Устгалаа");
      load();
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Кино ({movies.length})</h2>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditing(emptyMovie);
                setNotify(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Шинэ кино
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{(editing as Movie)?.id ? "Кино засах" : "Шинэ кино"}</DialogTitle>
            </DialogHeader>
            {editing && <MovieForm value={editing} onChange={setEditing} />}
            {!(editing as Movie)?.id && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={notify} onCheckedChange={(v) => setNotify(v === true)} />
                Telegram-аар бүх хэрэглэгчид мэдэгдэх
              </label>
            )}
            <DialogFooter>
              <Button onClick={save}>Хадгалах</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-hidden rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Гарчиг</th>
              <th className="px-4 py-2">Төрөл</th>
              <th className="px-4 py-2">Он</th>
              <th className="px-4 py-2">Эрх</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {movies.map((m) => (
              <tr key={m.id} className="border-t border-border/40">
                <td className="px-4 py-2 font-medium">{m.title}</td>
                <td className="px-4 py-2 text-muted-foreground">{m.genre}</td>
                <td className="px-4 py-2 text-muted-foreground">{m.year}</td>
                <td className="px-4 py-2">
                  {m.is_premium ? (
                    <Badge variant="default" className="gap-1">
                      <Crown className="h-3 w-3" /> Premium
                    </Badge>
                  ) : (
                    <Badge variant="outline">Үнэгүй</Badge>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(m);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => del(m.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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

function MovieForm({
  value,
  onChange,
}: {
  value: Partial<Movie>;
  onChange: (m: Partial<Movie>) => void;
}) {
  const set = (k: keyof Movie, v: unknown) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Гарчиг (MN)">
        <Input value={value.title ?? ""} onChange={(e) => set("title", e.target.value)} />
      </Field>
      <Field label="Title (EN)">
        <Input value={value.title_en ?? ""} onChange={(e) => set("title_en", e.target.value)} />
      </Field>
      <Field label="Төрөл">
        <Input value={value.genre ?? ""} onChange={(e) => set("genre", e.target.value)} />
      </Field>
      <Field label="Он">
        <Input
          type="number"
          value={value.year ?? 0}
          onChange={(e) => set("year", Number(e.target.value))}
        />
      </Field>
      <Field label="Үргэлжлэх (мин)">
        <Input
          type="number"
          value={value.duration_min ?? 0}
          onChange={(e) => set("duration_min", Number(e.target.value))}
        />
      </Field>
      <Field label="Найруулагч">
        <Input value={value.director ?? ""} onChange={(e) => set("director", e.target.value)} />
      </Field>
      <Field label="Жүжигчид" className="sm:col-span-2">
        <Input value={value.cast_list ?? ""} onChange={(e) => set("cast_list", e.target.value)} />
      </Field>

      <Field label="Постер зураг" className="sm:col-span-2">
        <UploadField
          kind="poster"
          accept="image/*"
          value={value.poster_url ?? ""}
          onChange={(url) => set("poster_url", url)}
        />
      </Field>
      <Field label="Backdrop зураг" className="sm:col-span-2">
        <UploadField
          kind="backdrop"
          accept="image/*"
          value={value.backdrop_url ?? ""}
          onChange={(url) => set("backdrop_url", url)}
        />
      </Field>
      <Field label="Видео файл (R2)" className="sm:col-span-2">
        <UploadField
          kind="video"
          accept="video/*"
          value={value.video_url ?? ""}
          onChange={(url) => set("video_url", url)}
        />
      </Field>

      <Field label="Тайлбар (MN)" className="sm:col-span-2">
        <Textarea
          value={value.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>
      <Field label="Description (EN)" className="sm:col-span-2">
        <Textarea
          value={value.description_en ?? ""}
          onChange={(e) => set("description_en", e.target.value)}
        />
      </Field>
      <div className="flex items-center gap-2">
        <Switch checked={!!value.is_premium} onCheckedChange={(c) => set("is_premium", c)} />
        <Label>Premium</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={!!value.is_featured} onCheckedChange={(c) => set("is_featured", c)} />
        <Label>Онцлох</Label>
      </div>
    </div>
  );
}

function UploadField({
  kind,
  accept,
  value,
  onChange,
}: {
  kind: "video" | "poster" | "backdrop" | "ad";
  accept: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... эсвэл доороос файл сонгоно уу"
        />
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm hover:bg-secondary/80">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {progress !== null ? `${progress}%` : "Файл сонгох"}
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={onFile}
            disabled={uploading}
          />
        </label>
      </div>
      {value && accept.startsWith("image") && (
        <img src={value} alt="" className="h-20 rounded border border-border/60 object-cover" />
      )}
    </div>
  );
}

/* ---------------- Payments ---------------- */
function PaymentsTab() {
  const list = useServerFn(adminListPayments);
  const confirmFn = useServerFn(adminConfirmPayment);
  const [items, setItems] = useState<
    Array<{
      id: string;
      payment_code: string;
      amount: number;
      status: string;
      created_at: string;
      email: string | null;
    }>
  >([]);
  const reload = () => list().then((r) => setItems(r.payments as unknown as typeof items));
  useEffect(() => {
    reload();
  }, []);

  const confirm = async (id: string) => {
    try {
      await confirmFn({ data: { paymentId: id } });
      toast.success("Баталгаажлаа");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const pending = items.filter((p) => p.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-xl font-semibold">Хүлээгдэж байгаа ({pending.length})</h2>
        {pending.length === 0 && (
          <p className="text-muted-foreground">Хүлээгдэж байгаа төлбөр алга.</p>
        )}
        <div className="grid gap-3">
          {pending.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-card p-4"
            >
              <div>
                <p className="font-mono font-semibold">{p.payment_code}</p>
                <p className="text-sm text-muted-foreground">
                  {p.email} · ₮{p.amount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleString("mn-MN")}
                </p>
              </div>
              <Button onClick={() => confirm(p.id)} className="gap-2">
                <CheckCircle2 className="h-4 w-4" /> Баталгаажуулах
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-xl font-semibold">Бүх төлбөр</h2>
        <div className="overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Код</th>
                <th className="px-4 py-2">Хэрэглэгч</th>
                <th className="px-4 py-2">Дүн</th>
                <th className="px-4 py-2">Төлөв</th>
                <th className="px-4 py-2">Огноо</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-border/40">
                  <td className="px-4 py-2 font-mono">{p.payment_code}</td>
                  <td className="px-4 py-2">{p.email}</td>
                  <td className="px-4 py-2">₮{p.amount.toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <Badge variant={p.status === "confirmed" ? "default" : "outline"}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("mn-MN")}
                  </td>
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
    if (!msg.trim()) {
      toast.error("Мессеж бичнэ үү");
      return;
    }
    if (!confirm(`Бүх Telegram-д холбогдсон хэрэглэгчид илгээх үү?`)) return;
    setSending(true);
    try {
      const r = await send({ data: { message: msg } });
      toast.success(`${r.sent}/${r.total} илгээгдлээ`);
      setMsg("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-xl font-semibold">Push мэдэгдэл (Telegram)</h2>
      <p className="text-sm text-muted-foreground">
        Telegram бот руу холбогдсон бүх хэрэглэгчид мессеж очно. HTML дэмжигдэнэ (&lt;b&gt;,
        &lt;i&gt;, &lt;a&gt;).
      </p>
      <Textarea
        rows={6}
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="Жишээ нь: 🎬 Энэ долоо хоногт шинэ кино нэмэгдэх болно!"
      />
      <Button onClick={onSend} disabled={sending} className="gap-2">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}{" "}
        Илгээх
      </Button>
    </div>
  );
}

/* ---------------- Ads ---------------- */
type Ad = {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  placements: string[];
  is_active: boolean;
  click_count: number;
  starts_at: string | null;
  ends_at: string | null;
};

function AdsTab() {
  const list = useServerFn(adminListAds);
  const upsert = useServerFn(adminUpsertAd);
  const del = useServerFn(adminDeleteAd);
  const [ads, setAds] = useState<Ad[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Ad> | null>(null);

  const reload = () => list().then((r) => setAds(r.ads as Ad[]));
  useEffect(() => {
    reload();
  }, []);

  const save = async () => {
    if (!editing?.title || !editing.image_url || !editing.link_url || !editing.placements?.length) {
      toast.error("Бүх талбарыг бөглөнө үү");
      return;
    }
    try {
      await upsert({
        data: {
          id: editing.id,
          data: {
            title: editing.title,
            image_url: editing.image_url,
            link_url: editing.link_url,
            placements: editing.placements as ("home" | "movie" | "plans" | "profile")[],
            is_active: editing.is_active ?? true,
            starts_at: editing.starts_at ?? null,
            ends_at: editing.ends_at ?? null,
          },
        },
      });
      toast.success("Хадгаллаа");
      setOpen(false);
      setEditing(null);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Устгах уу?")) return;
    try {
      await del({ data: { id } });
      toast.success("Устгалаа");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Зар ({ads.length})</h2>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={() => setEditing({ placements: ["home"], is_active: true })}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Шинэ зар
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Зар засах" : "Шинэ зар"}</DialogTitle>
            </DialogHeader>
            {editing && <AdForm value={editing} onChange={setEditing} />}
            <DialogFooter>
              <Button onClick={save}>Хадгалах</Button>
            </DialogFooter>
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
                {a.placements.map((p) => (
                  <Badge key={p} variant="secondary">
                    {p}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Дарагдсан: <b>{a.click_count}</b>
              </p>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditing(a);
                    setOpen(true);
                  }}
                >
                  <Pencil className="mr-1 h-3 w-3" /> Засах
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdForm({ value, onChange }: { value: Partial<Ad>; onChange: (a: Partial<Ad>) => void }) {
  const placements: ("home" | "movie" | "plans" | "profile")[] = [
    "home",
    "movie",
    "plans",
    "profile",
  ];
  const toggle = (p: string) => {
    const cur = value.placements ?? [];
    onChange({ ...value, placements: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p] });
  };
  return (
    <div className="space-y-3">
      <Field label="Гарчиг">
        <Input
          value={value.title ?? ""}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </Field>
      <Field label="Зураг (banner)">
        <UploadField
          kind="ad"
          accept="image/*"
          value={value.image_url ?? ""}
          onChange={(url) => onChange({ ...value, image_url: url })}
        />
      </Field>
      <Field label="Линк (URL)">
        <Input
          value={value.link_url ?? ""}
          onChange={(e) => onChange({ ...value, link_url: e.target.value })}
          placeholder="https://"
        />
      </Field>
      <Field label="Хаана харагдах">
        <div className="flex flex-wrap gap-3">
          {placements.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={(value.placements ?? []).includes(p)}
                onCheckedChange={() => toggle(p)}
              />{" "}
              {p}
            </label>
          ))}
        </div>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Эхлэх (заавал биш)">
          <Input
            type="datetime-local"
            value={value.starts_at?.slice(0, 16) ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
              })
            }
          />
        </Field>
        <Field label="Дуусах (заавал биш)">
          <Input
            type="datetime-local"
            value={value.ends_at?.slice(0, 16) ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
              })
            }
          />
        </Field>
      </div>
      <label className="flex items-center gap-2">
        <Switch
          checked={value.is_active ?? true}
          onCheckedChange={(c) => onChange({ ...value, is_active: c })}
        />{" "}
        Идэвхтэй
      </label>
    </div>
  );
}

/* ---------------- Settings ---------------- */
function SettingsTab() {
  const update = useServerFn(adminUpdateSettings);
  const [s, setS] = useState<{
    bank_name: string;
    bank_account_number: string;
    bank_account_name: string;
    premium_price: number;
    telegram_bot_username: string;
    admin_telegram_chat_id: number | null;
  } | null>(null);
  useEffect(() => {
    supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => setS(data as typeof s));
  }, []);
  if (!s) return null;
  const save = async () => {
    try {
      await update({
        data: {
          bank_name: s.bank_name,
          bank_account_number: s.bank_account_number,
          bank_account_name: s.bank_account_name,
          premium_price: Number(s.premium_price),
          telegram_bot_username: s.telegram_bot_username,
          admin_telegram_chat_id: s.admin_telegram_chat_id
            ? Number(s.admin_telegram_chat_id)
            : null,
        },
      });
      toast.success("Хадгаллаа");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div className="max-w-xl space-y-3">
      <Field label="Банк">
        <Input value={s.bank_name} onChange={(e) => setS({ ...s, bank_name: e.target.value })} />
      </Field>
      <Field label="Дансны дугаар">
        <Input
          value={s.bank_account_number}
          onChange={(e) => setS({ ...s, bank_account_number: e.target.value })}
        />
      </Field>
      <Field label="Хүлээн авагч">
        <Input
          value={s.bank_account_name}
          onChange={(e) => setS({ ...s, bank_account_name: e.target.value })}
        />
      </Field>
      <Field label="Premium үнэ (₮/сар)">
        <Input
          type="number"
          value={s.premium_price}
          onChange={(e) => setS({ ...s, premium_price: Number(e.target.value) })}
        />
      </Field>
      <Field label="Telegram bot username">
        <Input
          value={s.telegram_bot_username}
          onChange={(e) => setS({ ...s, telegram_bot_username: e.target.value })}
        />
      </Field>
      <Field label="Админ Telegram chat ID">
        <Input
          type="number"
          value={s.admin_telegram_chat_id ?? ""}
          onChange={(e) =>
            setS({ ...s, admin_telegram_chat_id: e.target.value ? Number(e.target.value) : null })
          }
        />
      </Field>
      <Button onClick={save}>Хадгалах</Button>
    </div>
  );
}

/* ---------------- shared ---------------- */
function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

/* ---------------- Users ---------------- */
type UserProfile = {
  id: string;
  display_name: string | null;
  payment_code: string | null;
  subscription_status: "free" | "premium";
  subscription_expires_at: string | null;
  telegram_chat_id: number | null;
  email: string;
};

function UsersTab() {
  const listFn = useServerFn(adminListUsers);
  const updateFn = useServerFn(adminUpdateUserSubscription);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<"free" | "premium">("free");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const reload = async () => {
    try {
      const res = await listFn();
      setUsers((res.users as unknown as UserProfile[]) ?? []);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const filtered = users.filter((u) => {
    const s = search.toLowerCase().trim();
    if (!s) return true;
    return (
      (u.email || "").toLowerCase().includes(s) ||
      (u.display_name || "").toLowerCase().includes(s) ||
      (u.payment_code || "").toLowerCase().includes(s)
    );
  });

  const openEdit = (u: UserProfile) => {
    setEditingUser(u);
    setStatus(u.subscription_status);
    setExpiresAt(u.subscription_expires_at ? u.subscription_expires_at.slice(0, 10) : "");
    setOpen(true);
  };

  const save = async () => {
    if (!editingUser) return;
    setLoading(true);
    try {
      const exp = status === "premium" && expiresAt ? new Date(expiresAt).toISOString() : null;
      await updateFn({
        data: {
          userId: editingUser.id,
          status,
          expiresAt: exp,
        },
      });
      toast.success("Хэрэглэгчийн эрхийг амжилттай шинэчиллээ!");
      setOpen(false);
      setEditingUser(null);
      reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Бүртгэлтэй хэрэглэгчид ({filtered.length})</h2>
        <div className="relative w-full sm:w-72">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Имэйл эсвэл нэрээр хайх..."
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Хэрэглэгч (Имэйл / Утас)</th>
              <th className="px-4 py-2">Нэр</th>
              <th className="px-4 py-2">Код</th>
              <th className="px-4 py-2">Эрх</th>
              <th className="px-4 py-2">Дуусах огноо</th>
              <th className="px-4 py-2 text-right">Үйлдэл</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const daysLeft = u.subscription_expires_at
                ? Math.max(
                    0,
                    Math.ceil(
                      (new Date(u.subscription_expires_at).getTime() - Date.now()) / 86400000,
                    ),
                  )
                : 0;
              return (
                <tr key={u.id} className="border-t border-border/40 hover:bg-secondary/10">
                  <td className="px-4 py-2 font-medium max-w-[200px] truncate" title={u.email}>
                    {u.email.startsWith("phone-") && u.email.endsWith("@moncone.online") ? (
                      <span className="text-primary font-mono font-semibold">
                        +976 {u.email.replace("phone-", "").replace("@moncone.online", "")}
                      </span>
                    ) : (
                      u.email
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{u.display_name || "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {u.payment_code || "—"}
                  </td>
                  <td className="px-4 py-2">
                    {u.subscription_status === "premium" ? (
                      <Badge variant="default" className="gap-1 bg-premium text-premium-foreground">
                        <Crown className="h-3 w-3" /> Premium
                      </Badge>
                    ) : (
                      <Badge variant="outline">Free</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {u.subscription_status === "premium" && u.subscription_expires_at ? (
                      <span>
                        {new Date(u.subscription_expires_at).toLocaleDateString("mn-MN")}
                        {daysLeft > 0 && (
                          <span className="ml-1 text-primary">({daysLeft} хоног үлдсэн)</span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                      Засах
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  Хэрэглэгч олдсонгүй
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditingUser(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Хэрэглэгчийн эрх засах</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Хэрэглэгч</Label>
                <p className="text-sm font-medium text-white">{editingUser.email}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Premium эрх</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                    <input
                      type="radio"
                      name="sub_status"
                      checked={status === "free"}
                      onChange={() => setStatus("free")}
                      className="accent-primary"
                    />
                    Free (Эрхгүй)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                    <input
                      type="radio"
                      name="sub_status"
                      checked={status === "premium"}
                      onChange={() => setStatus("premium")}
                      className="accent-primary"
                    />
                    Premium (Эрхтэй)
                  </label>
                </div>
              </div>

              {status === "premium" && (
                <div className="space-y-1.5 animate-slide-in">
                  <Label htmlFor="expiresAt" className="text-xs text-muted-foreground">
                    Дуусах огноо
                  </Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    required
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                  <div className="flex gap-2 pt-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 30);
                        setExpiresAt(d.toISOString().slice(0, 10));
                      }}
                    >
                      +30 хоног
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 90);
                        setExpiresAt(d.toISOString().slice(0, 10));
                      }}
                    >
                      +90 хоног
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const d = new Date();
                        d.setFullYear(d.getFullYear() + 1);
                        setExpiresAt(d.toISOString().slice(0, 10));
                      }}
                    >
                      +1 жил
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Цуцлах
            </Button>
            <Button
              onClick={save}
              disabled={loading}
              className="bg-primary text-primary-foreground"
            >
              {loading ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- HLS Transcoder Studio Tab ---------------- */
function TranscoderTab() {
  const [loading, setLoading] = useState(false);
  const [mp4Files, setMp4Files] = useState<any[]>([]);
  const [hlsOutputs, setHlsOutputs] = useState<any[]>([]);
  const [job, setJob] = useState<any>({
    status: "idle",
    fileName: "",
    outputName: "",
    progressTime: "00:00:00.00",
    speed: "0.0x",
    totalDuration: "00:00:00.00",
    percent: 0,
    logs: [],
    error: null,
  });

  const [selectedFile, setSelectedFile] = useState<string>("");
  const [outputName, setOutputName] = useState<string>("");
  const [encrypt, setEncrypt] = useState(false);
  
  // HLS Player Preview Dialog State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fetchStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch("/api/public/transcode", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setMp4Files(data.mp4Files || []);
        setHlsOutputs(data.hlsOutputs || []);
        if (data.job) {
          setJob(data.job);
          // Auto-select first file if none selected
          if (!selectedFile && data.mp4Files && data.mp4Files.length > 0) {
            setSelectedFile(data.mp4Files[0].name);
            const base = data.mp4Files[0].name.replace(/\.[^/.]+$/, "");
            setOutputName(base);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching transcode status:", err);
    }
  };

  // Poll status when job is running
  useEffect(() => {
    fetchStatus();
    let timer: any = null;
    if (job.status === "running") {
      timer = setInterval(fetchStatus, 1500);
    } else {
      timer = setInterval(fetchStatus, 10000); // lower frequency when idle
    }
    return () => clearInterval(timer);
  }, [job.status]);

  const handleStart = async () => {
    if (!selectedFile || !outputName) {
      toast.error("Сонгосон файл болон гаралтын нэр тодорхой байх ёстой.");
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Authentication failed");

      const res = await fetch("/api/public/transcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileName: selectedFile, outputName, encrypt }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("HLS Хөрвүүлэлт арын горимд амжилттай эхэллээ!");
        fetchStatus();
      } else {
        toast.error(data.error || "Алдаа гарлаа");
      }
    } catch (err: any) {
      toast.error(err.message || "Сүлжээний алдаа");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Хөрвүүлэлтийг зогсоох эсвэл статусыг цэвэрлэхдээ итгэлтэй байна уу?")) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Authentication failed");

      const res = await fetch("/api/public/transcode", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Статус цэвэрлэгдлээ / Хөрвүүлэлтийг зогсоолоо");
        fetchStatus();
      } else {
        toast.error(data.error || "Алдаа гарлаа");
      }
    } catch (err: any) {
      toast.error(err.message || "Сүлжээний алдаа");
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = (name: string) => {
    const relativeUrl = `/videos/${name}/master.m3u8`;
    navigator.clipboard.writeText(relativeUrl);
    toast.success(`HLS тоглуулагчийн URL хуулагдлаа: ${relativeUrl}`);
  };

  const handleFileChange = (fileName: string) => {
    setSelectedFile(fileName);
    const base = fileName.replace(/\.[^/.]+$/, "");
    setOutputName(base);
  };

  // Video preview player inside modal
  useEffect(() => {
    const video = document.getElementById("hls-preview-player") as HTMLVideoElement;
    if (!video || !previewUrl || !previewOpen) return;

    const Hls = (window as any).Hls;
    if (Hls && Hls.isSupported()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const token = session?.access_token;
        const hls = new Hls({
          xhrSetup: (xhr: any, url: string) => {
            if (url.includes("/api/public/transcode-key") && token) {
              xhr.setRequestHeader("Authorization", `Bearer ${token}`);
            }
          }
        });
        hls.loadSource(previewUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        (video as any)._hls = hls;
      });

      return () => {
        const v = document.getElementById("hls-preview-player") as any;
        if (v && v._hls) {
          v._hls.destroy();
          delete v._hls;
        }
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const token = session?.access_token;
        if (token) {
          const urlObj = new URL(previewUrl, window.location.origin);
          urlObj.searchParams.set("token", token);
          video.src = urlObj.toString();
        } else {
          video.src = previewUrl;
        }
        video.play().catch(() => {});
      });
    }
  }, [previewUrl, previewOpen]);

  // Load HLS CDN if not present when preview dialog opens
  useEffect(() => {
    if (previewOpen) {
      if (!(window as any).Hls) {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js";
        document.head.appendChild(script);
      }
    }
  }, [previewOpen]);

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="rounded-lg border border-border/60 bg-card p-6">
        <h3 className="text-xl font-bold text-white mb-2">🎬 HLS Adaptive Bitrate Transcoding Studio</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Энэхүү систем нь сервер дээрх бэлэн MP4 видео файлыг 100% үнэ төлбөргүйгээр, өндөр хамгаалалттай 
          <b> HLS (HTTP Live Streaming)</b> формат руу хөрвүүлнэ. Хөрвүүлсэн видео нь <b>480p, 720p, 1080p</b> 
          гэсэн 3 өөр чанарын сонголттойгоор сегментүүдэд хуваагдаж, хэрэглэгчдийн интернэтийн хурданд тааруулан 
          автоматаар чанараа өөрчилдөг бөгөөд хөтчөөс шууд татаж авах боломжгүй болж хамгаалагдана.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Step 1: Selection & Trigger */}
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-lg border border-border/60 bg-card p-5 space-y-4">
            <h4 className="font-semibold text-white">1. Хөрвүүлэх файл сонгох</h4>
            
            {mp4Files.length === 0 ? (
              <div className="rounded bg-secondary/50 p-4 text-center text-sm text-muted-foreground">
                Үндсэн хавтсанд .mp4 видео одоогоор олдсонгүй. Уншуулахын тулд сервер дээр MP4 файл хуулна уу.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mp4-select">MP4 Видео файл</Label>
                  <select
                    id="mp4-select"
                    value={selectedFile}
                    onChange={(e) => handleFileChange(e.target.value)}
                    disabled={job.status === "running"}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {mp4Files.map((file) => (
                      <option key={file.name} value={file.name}>
                        {file.name} ({file.sizeMB} MB)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="output-name">Гаралтын нэр (Хавтасны нэр)</Label>
                  <Input
                    id="output-name"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                    disabled={job.status === "running"}
                    placeholder="Жишээ: unur_bul"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Зөвхөн англи үсэг, тоо, зураас ашиглана.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/10 p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="encrypt-toggle" className="text-sm font-medium text-white flex items-center gap-1.5">
                      🔒 AES-128 DRM Хамгаалалт
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      Татаж авахаас хамгаалж, шифрлэх
                    </p>
                  </div>
                  <Switch
                    id="encrypt-toggle"
                    checked={encrypt}
                    onCheckedChange={setEncrypt}
                    disabled={job.status === "running"}
                  />
                </div>

                {job.status === "running" ? (
                  <Button
                    onClick={handleCancel}
                    variant="destructive"
                    className="w-full gap-2"
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Хөрвүүлэлтийг зогсоох</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleStart}
                    className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                    disabled={loading || mp4Files.length === 0}
                  >
                    <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>HLS Хөрвүүлэлт Эхлүүлэх</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Transcoded Streams List */}
          <div className="rounded-lg border border-border/60 bg-card p-5 space-y-4">
            <h4 className="font-semibold text-white">Бэлэн болсон HLS видеонууд</h4>
            {hlsOutputs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Одоогоор хөрвүүлсэн видео байхгүй байна.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {hlsOutputs.map((item: any) => {
                  const name = item.name || item;
                  const isEncrypted = !!item.isEncrypted;
                  return (
                    <div
                      key={name}
                      className="flex flex-col gap-2 rounded bg-secondary/30 border border-border/40 p-3 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-medium text-white truncate max-w-[120px]" title={name}>
                          {name}
                        </span>
                        <div className="flex gap-1 items-center">
                          {isEncrypted ? (
                            <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[9px] text-indigo-400 font-semibold border border-indigo-500/20">
                              🔒 DRM-Lite
                            </span>
                          ) : (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] text-amber-400 font-semibold border border-amber-500/20">
                              🔓 Нээлттэй
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyUrl(name)}
                          className="flex-1 py-1 text-[11px] h-7 gap-1"
                        >
                          <Copy className="h-3 w-3" /> URL хуулах
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 py-1 text-[11px] h-7 gap-1 bg-primary text-primary-foreground"
                          onClick={() => {
                            setPreviewUrl(`/videos/${name}/master.m3u8`);
                            setPreviewOpen(true);
                          }}
                        >
                          <Play className="h-3 w-3 fill-current" /> Тоглуулах
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Real-time Console & Logs */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-lg border border-border/60 bg-card p-5 space-y-4 flex flex-col h-full min-h-[500px]">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <span>хөрвүүлэгч процессор</span>
                {job.status === "running" && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                )}
              </h4>
              <Badge
                className={
                  job.status === "running"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : job.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : job.status === "failed"
                        ? "bg-destructive/10 text-destructive border border-destructive/20"
                        : "bg-secondary text-secondary-foreground"
                }
              >
                {job.status === "running"
                  ? "Хөрвүүлж байна"
                  : job.status === "completed"
                    ? "Амжилттай дууссан"
                    : job.status === "failed"
                      ? "Алдаа гарсан"
                      : "Бэлэн"
                }
              </Badge>
            </div>

            {/* Progress Bar & Details */}
            {job.status !== "idle" && (
              <div className="rounded bg-secondary/40 p-4 border border-border/40 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Процесс: <strong className="text-white">{job.fileName}</strong></span>
                  <span className="font-mono text-emerald-400 font-semibold">{job.percent}%</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${job.percent}%` }}
                  ></div>
                </div>
                {/* Details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono pt-1">
                  <div>
                    <span className="block text-[10px] text-muted-foreground">ЭХЛЭХ ХУГАЦАА</span>
                    <span className="text-white">{job.progressTime}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground">НИЙТ ХУГАЦАА</span>
                    <span className="text-white">{job.totalDuration}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground">ХӨРВҮҮЛЭХ ХУРД</span>
                    <span className="text-emerald-400">{job.speed}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground">ГАРАЛТ</span>
                    <span className="text-white">/videos/{job.outputName}/</span>
                  </div>
                </div>
              </div>
            )}

            {/* Console Log Terminal */}
            <div className="flex-1 flex flex-col min-h-[300px]">
              <span className="text-xs text-muted-foreground mb-1.5 block">Серверийн консоль лог:</span>
              <div className="flex-1 rounded bg-black border border-border/80 p-4 font-mono text-[11px] leading-relaxed text-slate-300 overflow-y-auto max-h-[350px] space-y-1">
                {job.logs.length === 0 ? (
                  <span className="text-slate-500 italic">// Консолийн бүртгэл хоосон байна.</span>
                ) : (
                  job.logs.map((log: string, idx: number) => {
                    let color = "text-slate-300";
                    if (log.includes("Success!") || log.includes("completed successfully")) color = "text-emerald-400 font-semibold";
                    else if (log.includes("Error:") || log.includes("failed") || log.includes("process failed")) color = "text-rose-400";
                    else if (log.includes("⏳ Progress") || log.includes("Detected video total duration")) color = "text-cyan-400";
                    
                    return (
                      <div key={idx} className={color}>
                        {log}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-muted-foreground">Шинэчлэгдсэн: {new Date().toLocaleTimeString("mn-MN")}</span>
                {job.status !== "idle" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 text-muted-foreground hover:text-white"
                    onClick={handleCancel}
                  >
                    Бүртгэлийг Цэвэрлэх
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl bg-black border-border/60 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">🎥 HLS Adaptive Stream Шуурхай Үзэх</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full bg-black rounded-md overflow-hidden border border-border/30 mt-2">
            {previewUrl && previewOpen && (
              <video
                id="hls-preview-player"
                controls
                autoPlay
                className="h-full w-full"
              />
            )}
          </div>
          <div className="text-xs text-muted-foreground space-y-1 mt-2 font-mono">
            <p><strong>Stream Playlist URL:</strong> {previewUrl}</p>
            <p className="text-[10px] text-emerald-400">✓ Multi-bitrate adaptive streaming is active. Select quality settings in the player controls if available.</p>
          </div>
          <DialogFooter className="pt-2">
            <Button onClick={() => setPreviewOpen(false)} className="bg-primary text-white font-semibold">
              Хаах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

