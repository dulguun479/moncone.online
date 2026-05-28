import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-4xl font-bold text-white border-b border-border/40 pb-4">
        Нууцлалын бодлого / Privacy Policy
      </h1>
      
      <div className="space-y-8 text-muted-foreground leading-relaxed">
        {/* Mongolian Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">1. Монгол хэл дээрх нууцлалын бодлого</h2>
          <p>
            Moncone.online (“бид”, “манай”) нь хэрэглэгчийн нууцлалыг хамгаалахад онцгойлон анхаардаг. Энэхүү Нууцлалын бодлого нь манай вэбсайт болон Android аппликейшнийг ашиглах явцад таны хувийн мэдээллийг хэрхэн цуглуулах, ашиглах, хамгаалах тухай мэдээллийг агуулна.
          </p>
          
          <h3 className="text-lg font-semibold text-white mt-4">Мэдээлэл цуглуулах ба ашиглалт</h3>
          <p>
            Манай үйлчилгээг ашиглахад бид дараах хувийн мэдээллийг цуглуулж болно:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Бүртгэлийн мэдээлэл:</strong> Таны цахим шуудан (email), утасны дугаар, нэр.</li>
            <li><strong>Үйлчилгээний ашиглалт:</strong> Кино үзэлтийн түүх, хайлтын түүх, аппликейшний тохиргоо зэрэг үйлчилгээний сайжруулалтад шаардлагатай мэдээллүүд.</li>
            <li><strong>Төхөөрөмжийн мэдээлэл:</strong> IP хаяг, үйлдлийн систем, хөтөч болон төхөөрөмжийн төрөл.</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-4">Мэдээллийн аюулгүй байдал</h3>
          <p>
            Бид таны хувийн мэдээллийг гуравдагч этгээдэд худалдахгүй, түрээслэхгүй, задруулахгүй. Таны мэдээллийг шифрлэгдсэн (SSL/TLS) холболтоор дамжуулж, өндөр хамгаалалттай Supabase өгөгдлийн санд хадгалдаг.
          </p>
        </section>

        {/* English Section */}
        <section className="space-y-4 pt-6 border-t border-border/40">
          <h2 className="text-2xl font-semibold text-white">2. Privacy Policy in English</h2>
          <p>
            Moncone.online ("we", "our", or "us") respects your privacy and is committed to protecting your personal data. This Privacy Policy describes how we collect, use, and safeguard your information when you use our website and Android mobile application.
          </p>
          
          <h3 className="text-lg font-semibold text-white mt-4">Information Collection and Use</h3>
          <p>
            When using our platform, we may collect the following personal information:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Account Information:</strong> Your email address, phone number, and display name.</li>
            <li><strong>Usage Data:</strong> Watch history, search queries, and app settings to continuously optimize and personalize your experience.</li>
            <li><strong>Device Specifications:</strong> IP address, operating system, browser type, and device identifiers.</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-4">Data Security</h3>
          <p>
            We do not sell, rent, or lease your personal information to third parties. All network communications are encrypted via SSL/TLS, and data is stored securely in our cloud databases.
          </p>
        </section>
        
        {/* Contact info */}
        <section className="space-y-4 pt-6 border-t border-border/40 bg-card p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-white">Холбоо барих / Contact Us</h2>
          <p>
            Нууцлалын бодлоготой холбоотой санал хүсэлт, асуулт байвал манай хэрэглэгчийн тусламжийн суваг эсвэл <strong>support@moncone.online</strong> хаягаар холбогдоно уу.
          </p>
        </section>
      </div>
    </div>
  );
}
