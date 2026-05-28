import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "mn" | "en";

const dict = {
  mn: {
    "nav.home": "Нүүр",
    "nav.movies": "Кино",
    "nav.profile": "Профайл",
    "nav.admin": "Админ",
    "nav.login": "Нэвтрэх",
    "nav.signup": "Бүртгүүлэх",
    "nav.logout": "Гарах",
    "common.search": "Кино хайх...",
    "common.allGenres": "Бүх төрөл",
    "common.featured": "Онцлох",
    "common.trending": "Тренд",
    "common.related": "Холбоотой кино",
    "common.watch": "Үзэх",
    "common.play": "Тоглуулах",
    "common.premium": "Премиум",
    "common.free": "Үнэгүй",
    "common.cast": "Жүжигчид",
    "common.director": "Найруулагч",
    "common.year": "Он",
    "common.genre": "Төрөл",
    "common.duration": "Үргэлжлэх хугацаа",
    "common.min": "минут",
    "common.subscribe": "Захиалга авах",
    "auth.email": "И-мэйл",
    "auth.password": "Нууц үг",
    "auth.name": "Нэр",
    "auth.haveAccount": "Бүртгэлтэй юу? Нэвтрэх",
    "auth.noAccount": "Шинээр бүртгүүлэх",
    "auth.signin": "Нэвтрэх",
    "auth.signup": "Бүртгүүлэх",
    "profile.title": "Миний профайл",
    "profile.plan": "Захиалгын төлөв",
    "profile.upgrade": "Премиум руу шилжих",
    "profile.save": "Хадгалах",
    "admin.title": "Админ удирдлага",
    "admin.movies": "Кино",
    "admin.stats": "Статистик",
    "admin.subscribers": "Захиалагчид",
    "admin.revenue": "Орлого",
    "admin.add": "Шинэ кино",
    "admin.edit": "Засах",
    "admin.delete": "Устгах",
    "premium.locked": "Энэ кино Премиум захиалгатай үзэгчдэд",
    "hero.tagline": "Монгол кино бүгд нэг газар",
    "footer.tagline": "Монголын кино урсгал үйлчилгээ",
    "plans.title": "Премиум болох",
    "plans.howto": "Дансаар шилжүүлэг хийх заавар",
    "plans.bank": "Банк",
    "plans.account": "Дансны дугаар",
    "plans.holder": "Хүлээн авагч",
    "plans.amount": "Дүн",
    "plans.code": "Таны код",
    "plans.note": "Шилжүүлгийн утгад заавал бичнэ үү",
    "plans.confirm": "Би шилжүүлсэн",
    "plans.pending": "Төлбөр баталгаажихыг хүлээж байна. Админ шалгаад идэвхжүүлнэ.",
    "plans.tg.title": "Telegram мэдэгдэл",
    "plans.tg.desc": "Төлбөр баталгаажмагц мэдэгдэл авахыг хүсвэл бот руу холбогдоно уу.",
    "plans.tg.cta": "Telegram-д холбох",
    "plans.history": "Миний төлбөрийн түүх",
    "status.free": "Үнэгүй",
    "status.premium": "ПРЕМИУМ",
    "status.expires": "Дуусах огноо",
    "status.daysLeft": "хоног үлдсэн",
    "status.renew": "Сунгах",
    "tg.connected": "Telegram холбогдсон",
    "tg.notConnected": "Telegram холбогдоогүй",
    "admin.payments": "Төлбөр",
    "admin.settings": "Тохиргоо",
    "admin.confirm": "Баталгаажуулах",
    "admin.export": "CSV татах",
  },
  en: {
    "nav.home": "Home",
    "nav.movies": "Movies",
    "nav.profile": "Profile",
    "nav.admin": "Admin",
    "nav.login": "Sign In",
    "nav.signup": "Sign Up",
    "nav.logout": "Sign Out",
    "common.search": "Search movies...",
    "common.allGenres": "All genres",
    "common.featured": "Featured",
    "common.trending": "Trending",
    "common.related": "Related movies",
    "common.watch": "Watch",
    "common.play": "Play",
    "common.premium": "Premium",
    "common.free": "Free",
    "common.cast": "Cast",
    "common.director": "Director",
    "common.year": "Year",
    "common.genre": "Genre",
    "common.duration": "Duration",
    "common.min": "min",
    "common.subscribe": "Subscribe",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.name": "Name",
    "auth.haveAccount": "Have an account? Sign in",
    "auth.noAccount": "Create an account",
    "auth.signin": "Sign In",
    "auth.signup": "Sign Up",
    "profile.title": "My profile",
    "profile.plan": "Subscription",
    "profile.upgrade": "Upgrade to Premium",
    "profile.save": "Save",
    "admin.title": "Admin dashboard",
    "admin.movies": "Movies",
    "admin.stats": "Stats",
    "admin.subscribers": "Subscribers",
    "admin.revenue": "Revenue",
    "admin.add": "Add movie",
    "admin.edit": "Edit",
    "admin.delete": "Delete",
    "premium.locked": "This movie requires a Premium subscription",
    "hero.tagline": "Mongolian cinema, all in one place",
    "footer.tagline": "Mongolian movie streaming service",
    "plans.title": "Become Premium",
    "plans.howto": "Bank transfer instructions",
    "plans.bank": "Bank",
    "plans.account": "Account number",
    "plans.holder": "Recipient",
    "plans.amount": "Amount",
    "plans.code": "Your code",
    "plans.note": "Include in transfer note",
    "plans.confirm": "I have transferred",
    "plans.pending": "Awaiting admin confirmation.",
    "plans.tg.title": "Telegram notifications",
    "plans.tg.desc": "Connect to the bot to receive payment confirmation notifications.",
    "plans.tg.cta": "Connect Telegram",
    "plans.history": "My payment history",
    "status.free": "Free",
    "status.premium": "PREMIUM",
    "status.expires": "Expires on",
    "status.daysLeft": "days left",
    "status.renew": "Renew",
    "tg.connected": "Telegram connected",
    "tg.notConnected": "Telegram not connected",
    "admin.payments": "Payments",
    "admin.settings": "Settings",
    "admin.confirm": "Confirm",
    "admin.export": "Export CSV",
  },
} as const;

type Key = keyof (typeof dict)["mn"];

const I18nCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: "mn",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("mn");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem("lang") as Lang)) || "mn";
    setLangState(saved);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };
  const t = (k: Key) => dict[lang][k] ?? k;
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);

export function pickLocalized<
  T extends {
    title?: string | null;
    title_en?: string | null;
    description?: string | null;
    description_en?: string | null;
  },
>(m: T, lang: Lang) {
  return {
    title: lang === "en" ? m.title_en || m.title || "" : m.title || "",
    description: lang === "en" ? m.description_en || m.description || "" : m.description || "",
  };
}
