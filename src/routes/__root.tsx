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
import { AiChatAssistant } from "@/components/ai-chat-assistant";
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
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { title: "moncone — Монгол кино урсгал" },
      {
        name: "description",
        content:
          "Монголын кино, түүхэн киноны урсгал үйлчилгээ. moncone — Mongolian movie streaming.",
      },
      { name: "theme-color", content: "#e50914" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "moncone" },
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
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const fbAppId = import.meta.env.VITE_FACEBOOK_APP_ID || (typeof process !== "undefined" ? process.env.FACEBOOK_APP_ID : "") || "{your-app-id}";
  const fbApiVersion = import.meta.env.VITE_FACEBOOK_API_VERSION || (typeof process !== "undefined" ? process.env.FACEBOOK_API_VERSION : "") || "v18.0";
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID || (typeof process !== "undefined" ? process.env.GA_MEASUREMENT_ID : "") || "";
  const adsenseClientId = import.meta.env.VITE_ADSENSE_CLIENT_ID || "";

  return (
    <html lang="mn" className="dark">
      <head>
        <HeadContent />
        {/* Google Search Console Verification */}
        <meta name="google-site-verification" content="T1fOaBHzLk2QQnfLeYEq7nEWfK7nFJqPRpLwNUp1UnA" />
        {/* Leadfeeder Web Visitors tracking */}
        <script dangerouslySetInnerHTML={{ __html: `(function(ss,ex){ window.ldfdr=window.ldfdr||function(){(ldfdr._q=ldfdr._q||[]).push([].slice.call(arguments));}; (function(d,s){ fs=d.getElementsByTagName(s)[0]; function ce(src){ var cs=d.createElement(s); cs.src=src; cs.async=1; fs.parentNode.insertBefore(cs,fs); }; ce('https://sc.lfeeder.com/lftracker_v1_'+ss+(ex?'_'+ex:'')+'.js'); })(document,'script'); })('lYNOR8x9yvN7WQJZ');` }} />
        {/* Google AdSense Integration */}
        {adsenseClientId && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
          />
        )}
        {/* Google Analytics 4 (gtag.js) */}
        {gaId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
            <script dangerouslySetInnerHTML={{ __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            ` }} />
          </>
        )}
        {/* Facebook SDK for JavaScript */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.fbAsyncInit = function() {
            FB.init({
              appId      : '${fbAppId}',
              cookie     : true,
              xfbml      : true,
              version    : '${fbApiVersion}'
            });
            FB.AppEvents.logPageView();
          };

          (function(d, s, id){
             var js, fjs = d.getElementsByTagName(s)[0];
             if (d.getElementById(id)) {return;}
             js = d.createElement(s); js.id = id;
             js.src = "https://connect.facebook.net/en_US/sdk.js";
             fjs.parentNode.insertBefore(js, fjs);
           }(document, 'script', 'facebook-jssdk'));
        ` }} />
      </head>
      <body className="dark min-h-screen bg-background text-foreground relative overflow-x-hidden">
        {/* Ambient deep space floating mesh blobs */}
        <div className="bg-blob-red top-[-100px] left-[-200px]" />
        <div className="bg-blob-purple top-[30vh] right-[-300px]" />
        <div className="bg-blob-gold bottom-[10vh] left-[20vw]" />
        
        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Handle Supabase auth state shifts
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // Register Service Worker for PWA
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const registerSW = () => {
        navigator.serviceWorker.register("/sw.js").then(
          (registration) => {
            console.log("Service Worker registered successfully with scope: ", registration.scope);
          },
          (err) => {
            console.error("Service Worker registration failed: ", err);
          },
        );
      };

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
    }
  }, []);
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
          <AiChatAssistant />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
