import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import appCss from "../styles.css?url";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Алдаа гарлаа</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Дахин оролдох
        </button>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
      <div>
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <p className="mt-2 text-muted-foreground">Хуудас олдсонгүй</p>
        <a
          href="/"
          className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Нүүр хуудас
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "moncone — Монгол кино урсгал" },
      {
        name: "description",
        content:
          "Монголын кино, түүхэн киноны урсгал үйлчилгээ. moncone — Mongolian movie streaming.",
      },
      { property: "og:title", content: "moncone — Монгол кино урсгал" },
      {
        property: "og:description",
        content:
          "Монголын кино, түүхэн киноны урсгал үйлчилгээ. moncone — Mongolian movie streaming.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "moncone — Монгол кино урсгал" },
      {
        name: "twitter:description",
        content:
          "Монголын кино, түүхэн киноны урсгал үйлчилгээ. moncone — Mongolian movie streaming.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0d1bb885-94b0-4518-8a3e-b065791469b3/id-preview-93fc9f58--4ed09b53-4ef5-4ec4-8a51-8f0beaff344f.lovable.app-1779088424588.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0d1bb885-94b0-4518-8a3e-b065791469b3/id-preview-93fc9f58--4ed09b53-4ef5-4ec4-8a51-8f0beaff344f.lovable.app-1779088424588.png",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="dark min-h-screen bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
    });
    return () => subscription.unsubscribe();
  }, [router]);
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <SiteHeader />
          <main className="min-h-[calc(100vh-4rem)]">
            <Outlet />
          </main>
          <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} moncone</p>
          </footer>
          <Toaster theme="dark" position="top-center" />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
