# moncone — Төслийг шилжүүлэх болон худалдах зааварчилгаа (Handover & Sales Guide)

Энэхүү гарын авлага нь **moncone.online** төслийн техникийн бүтэц, худалдан авагчдад өгөх зааварчилгаа, Монгол болон Гадаад киног албан ёсны эрхтэйгээр хэрхэн байршуулах хууль зүйн гарын авлага, мөн вэбсайтыг хэрхэн ашигтай бизнес болгож мөнгө олох замын зургийг (Monetization Roadmap) багтаасан мэргэжлийн түвшний баримт бичиг юм.

*This guide is a professional-grade document covering the technical architecture of the **moncone.online** project, buyer setup instructions, a legal movie licensing playbook for Mongolian and foreign content, and a comprehensive business monetization roadmap to maximize listing value.*

---

## 1. Системийн бүтэц болон давуу талууд (Technical Architecture & USPs)

Худалдан авагчид вэбсайтын технологийг маш их сонирхож, сервер зардлыг хамгийн түрүүнд асуудаг. Төслийн давуу талыг дараах байдлаар тайлбарлана:
*Potential buyers always analyze server costs and backend architecture. Present the platform using these key selling points:*

* **Вэб систем (Frontend & SSR)**:
  * **MN**: React болон TanStack Start (Vite). Server-Side Rendering (SSR) дэмждэг тул хайлтын системд маш сайн оновчлогдсон (SEO ready), хуудас ачаалагдах хурд маш өндөр.
  * **EN**: Built on React & TanStack Start (Vite) with Server-Side Rendering (SSR). This provides top-tier SEO friendliness, fast initial load speeds, and dynamic hydration.
  * **Зардал (Server Cost)**: **0 ₮ / $0** (Cloudflare Workers / Pages serverless технологиор ажилладаг тул сар бүр серверт мөнгө төлөхгүй).
  * **EN**: Powered by Cloudflare Workers/Pages SSR. Baseline server cost is completely **$0/month** due to serverless computing scales.

* **Өгөгдлийн сан болон Хэрэглэгчийн бүртгэл (Database & Auth)**:
  * **MN**: Supabase (PostgreSQL). Row-Level Security (RLS) тохируулсан тул хэрэглэгчдийн мэдээлэл найдвартай хамгаалагдсан. Telegram OTP (Утас руу нэг удаагийн код илгээх) систем суурилагдсан.
  * **EN**: Supabase (PostgreSQL) with strict Row-Level Security (RLS) rules. Auth runs on Telegram OTP (One-Time Passcode via SMS/Telegram webhook) and Facebook login.
  * **Зардал (Database Cost)**: **0 ₮ / $0** (Supabase-ийн үнэгүй багцад бүрэн багтсан).

* **Медиа хадгалалт (Storage & Streaming)**:
  * **MN**: Cloudflare R2 (S3-тэй нийцтэй хамгийн хямд объект хадгалах сан). Видео файлуудыг өндөр хурдаар хэрэглэгч рүү дамжуулдаг (Streaming).
  * **EN**: Cloudflare R2 (S3-compatible, ultra-low cost object storage) for hosting high-definition movie files with fast global content delivery (CDN).
  * **Зардал (Storage Cost)**: Төлбөр нь зөвхөн хэрэглээнээс хамаарна (1 GB = сарын ~$0.015, эхний 10 GB нь бүрэн үнэгүй).

* **HLS видео хамгаалалт ба адаптив дамжуулалт (HLS Streaming & Video Security)**:
  * **MN**: Үндсэн админ системд үнэ төлбөргүй **HLS Transcoding Studio** холбосон. Сервер дээрх MP4 файлыг шууд вэб удирдлагын хэсгээс **480p, 720p, 1080p** гэсэн 3 өөр чанарын сонголттой, хамгаалалттай HLS видео болгон хувааж хөрвүүлнэ. Ингэснээр хэрэглэгчид шууд татаж авах боломжгүй болж хамгаалагдахын зэрэгцээ сүлжээний хурдаас хамаарч чанар нь автоматаар тохируулагддаг.
  * **EN**: The platform includes a zero-cost, enterprise-grade **HLS Transcoding Studio** built into the administrator panel. It converts MP4 uploads into secure, adaptive multi-bitrate streams (**480p, 720p, and 1080p**) with a live terminal logger. This protects intellectual property from direct browser video downloads and adjusts stream quality dynamically based on viewer network speeds.

* **Гар утасны аппликейшн (Android Native App)**:
  * **MN**: Native Kotlin хэл дээр бичигдсэн. Google Play Console-д шууд оруулахад бэлэн албан ёсны гарын үсэгтэй `.aab` файл болон Play Store график хэрэгслүүд бэлэн болсон.
  * **EN**: Native Kotlin Android App. Ready to publish with signed `.aab` (Android App Bundle), play store icons, and screenshots in the delivery package.

---

## 2. Худалдан авагчдын асуух 5 гол асуулт ба хариулт (FAQ for Buyers)

**Q1: Сар бүр вэбсайтыг ажиллуулахад ямар тогтмол зардал гарах вэ?**
* **MN**: Сервергүй (serverless) технологи ашиглаж байгаа тул суурь зардал нь **0 ₮**. Зөвхөн хэрэглэгчид их хэмжээгээр кино үзэж эхлэх үед Cloudflare R2-ийн медиа урсгалын зардал (сард хэдхэн доллар) маш багаар гарна.
* **EN**: Baseline operational cost is **$0**. Server hosting (Cloudflare Pages) and database (Supabase) are free. You only pay for Cloudflare R2 storage bandwidth as your active streaming traffic scales, which costs pennies ($0.015 per GB).

**Q2: Би шинэ кино болон сурталчилгааг хэрхэн нэмэх вэ?**
* **MN**: Вэбсайтад аюулгүй нэгдсэн өгөгдөл оруулах endpoint (`/api/public/setup-admin`) суурилуулсан. Мөн Supabase Dashboard-оор дамжуулан кино, сурталчилгааны баннеруудыг хэдхэн секундэд нэмж удирдах боломжтой.
* **EN**: The app has built-in administrative management through Supabase tables and a custom admin dashboard. You can add new movies, backdrops, and active advertisements in seconds.

**Q3: Гар утасны апп-ыг хэрхэн Play Store-т байршуулах вэ?**
* **MN**: Хүлээлгэн өгөх хавтас дотор `app-release.aab` файл бэлэн байгаа. Google Play Console-д нэвтэрч, шинэ апп үүсгээд энэхүү файлыг чирч оруулан, бэлэн бэлтгэсэн лого, нүүр зургуудыг оруулахад л хангалттай.
* **EN**: Simply upload the pre-compiled `app-release.aab` file from our delivery folder directly to your Google Play Console, drag-and-drop the prepared app icon and feature graphics, and submit for review.

**Q4: Хандалтыг (Traffic) хэрхэн баталгаажуулах вэ?**
* **MN**: Вэбсайтын эх кодонд Google Analytics 4 (GA4) амжилттай холбогдсон бөгөөд одоогоор хандалтыг шууд бүртгэж байна. Flippa дээр зараа байршуулах үед өөрийн Google Analytics бүртгэлээ холбоход хандалтын түүх автоматаар баталгаажин харагдана.
* **EN**: Google Analytics 4 (GA4) is fully integrated into the code. When listing on Flippa, you can link your Google Analytics account directly to verify the real-time active traffic automatically.

**Q5: Хэрэглэгчид хэрхэн төлбөр төлж кино үзэх вэ?**
* **MN**: Системд кинонуудыг үнэгүй болон Премиум (Төлбөртэй) гэж ангилах боломжтой. Монголын хэрэглэгчид дансаар мөнгөө шилжүүлж, өөрийн нэг удаагийн төлбөрийн кодыг гүйлгээний утга дээр бичих бөгөөд админ түүнийг нь Supabase-ээр ганц товшилтоор баталгаажуулна. Мөн олон улсын хэрэглэгчдэд зориулсан Stripe автомат картын систем суурилагдсан.
* **EN**: The system supports Free and Premium (paid) movies. Users can pay via bank transfers (admin confirms with one-click approval using Supabase) or utilize the automated international Stripe checkout integration built into the code.

---

## 3. Өмчлөх эрхийг шилжүүлэх дараалал (Ownership Transfer Checklist)

Төслийг худалдсаны дараа дараах өмчлөлүүдийг шилжүүлнэ:
*Follow these steps during the escrow/handover process:*

1. **Домэйн нэр (Domain Name)**:
   * `moncone.online` домэйн бүртгүүлсэн газраас худалдан авагчийн хаяг руу үнэгүй шилжүүлнэ (Domain push).
2. **Cloudflare хаяг**:
   * Вэбсайтын хостинг болон видео хадгалалтыг шилжүүлэхийн тулд Cloudflare дээрх Pages төслийг худалдан авагчийн хаяг руу шилжүүлэх эсвэл хаягаа бүхэлд нь хүлээлгэж өгнө.
3. **Supabase өгөгдлийн сан (Database)**:
   * Supabase Dashboard-д нэвтэрч, `Settings -> General -> Transfer Project` хэсгээс худалдан авагчийн имэйл хаягийг оруулан өгөгдлийн санг бүхэлд нь шилжүүлнэ.
4. **Эх код (Source Code)**:
   * Энэхүү хавтаст байгаа вэб болон Android аппликейшны эх кодыг ZIP файл болгон хүлээлгэж өгнө.

---

## 4. Шинэ эзэмшигчид зориулсан Тохиргооны зааварчилгаа (Buyer Configuration Guide)

Худалдан авагч эх кодыг өөрийн сервер дээр ажиллуулахын тулд маш хялбархан дараах алхмуудыг хийнэ. **Кодон дотор ямар ч имэйл хаяг эсвэл нууц түлхүүрүүд хатуу бичигдээгүй тул маш аюулгүй:**
*The buyer can configure the entire platform without touching the codebase. No personal details are hardcoded in the codebase:*

1. **Админ эрх тохируулах (Set Admin Email)**:
   * Cloudflare Pages-ийн Environment Variables хэсэгт `ADMIN_EMAIL` хувьсагчид өөрийн имэйл хаягийг тохируулна.
   * Supabase-ийн `app_settings` хүснэгтийн `admin_email` баганад өөрийн имэйл хаягийг оруулна.
   * Вэбсайт дээрээ тухайн имэйлээр бүртгүүлэхэд систем автоматаар админ эрх (Admin role) олгох болно.
2. **SMS & Telegram OTP холбох (Set API Keys)**:
   * Cloudflare Dashboard дотор өөрийн `SMS_MN_API_KEY` (SMS.mn сайтаас авсан түлхүүр) болон `TELEGRAM_BOT_TOKEN`-ийг тохируулж, вэб болон апп-аа өөрийнхөө удирдлагад бүрэн оруулна.

---

## 5. Киноны албан ёсны зөвшөөрөл/эрх авах гарын авлага (Legal Movie Licensing Playbook)

Киноны платформыг хуулийн дагуу, зохиогчийн эрхийн зөрчилгүй ажиллуулах нь вэбсайтын нэр хүнд болон бизнесийн үнэ цэнийг хадгалах хамгийн чухал үндэс юм. 

### A. Монгол киноны эрх авах (Licensing Domestic Mongolian Movies)
Монгол киног платформ дээрээ байршуулахын тулд дараах хууль ёсны алхмуудыг хийнэ:

1. **Уран бүтээлчидтэй шууд холбогдох (Direct Production Outreach)**:
   * Монголын кино студиуд (жишээ нь: *Хүрээ Энтертайнмент*, *Фантастик Продакшн*, *Монгол Фильм Групп*) болон бие даасан найруулагч, продюсеруудтай холбоо тогтооно.
   * **Гэрээний загварууд (Contract Models)**:
     * **Ашиг хуваах гэрээ (Revenue Share)**: Хамгийн түгээмэл загвар. Кино үзэлтээс олсон орлого (Премиум эрх эсвэл үзэлтийн тоогоор) эсвэл зар сурталчилгааны ашгийг продюсертой **50/50** эсвэл **60/40** (студийн талд давуу байдлаар) хувиар гэрээлэн хуваана. Энэ нь эхний ээлжинд ямар нэгэн хөрөнгө оруулалтын зардал гаргахгүй тул вэбсайтын эзэнд маш ашигтай.
     * **Тогтмол хураамж (Flat-rate Licensing)**: Шинэ болон бэстселлер киноны эрхийг 1-2 жилийн хугацаатайгаар тогтмол үнээр худалдан авч байршуулна.
2. **Монголын Үндэсний Кино Хороо (Mongolian National Film Committee)**:
   * Кино урлагийг дэмжих тухай хуулийн дагуу тус хорооноос албан ёсны бүртгэл, зөвшөөрөл авч, зохиогчийн эрхийн дагуу үйл ажиллагаа явуулж байгаагаа баталгаажуулж болно.
3. **Оюуны Өмчийн Газар (Intellectual Property Office of Mongolia)**:
   * Албан ёсны онцгой болон энгийн эрхийн гэрээг Оюуны өмчийн газарт бүртгүүлснээр таны вэбсайт тухайн киног үзүүлэх албан ёсны онцгой эрхтэй дижитал дистрибьютор болж баталгаажна.

### B. Гадаад киноны эрх авах (Licensing Foreign Movies)
Гадаадын Холливуд болон бусад орны кинонуудыг байршуулахдаа дараах сувгуудыг ашиглана:

1. **Дотоодын дистрибьютор компаниудаар дамжуулах (Local Sub-Licensing Sub-distributors)**:
   * Монголд гадаадын томоохон студиудын киног албан ёсны эрхтэйгээр оруулж ирдэг *Digital Content LLC*, *Nomad Pictures LLC* зэрэг компаниудтай хамтран ажиллах гэрээ байгуулж, тэдний лицензтэй киноны сангаас вэбсайтдаа байршуулах эрх авна.
2. **Бие даасан олон улсын борлуулагч агентлагууд (Independent Sales Agents)**:
   * Олон улсын кино наадам, кино худалдааны зах зээл (жишээ нь: *Cannes Film Market*, *American Film Market*) дээр үйл ажиллагаа явуулдаг бие даасан борлуулагч агентлагуудаас (жишээ нь: *FilmSharks*, *Shoreline Entertainment*) бага хэмжээний төлбөрөөр орон нутгийн (Regional/Mongolian territorial) дижитал дамжуулах эрхийг худалдаж авах боломжтой.
3. **Хууль ёсны оруулах аргууд (Legal Alternative Approaches - Zero License Costs)**:
   * **YouTube / Vimeo Iframe интеграци**: Гадаадын болон Монголын уран бүтээлчдийн өөрсдийн суваг дээрх албан ёсны, нээлттэй бичлэгүүдийг өөрийн вэбсайт руу "iframe embed" кодоор оруулан вэбсайтдаа нэгтгэх. Энэ нь зохиогчийн эрх зөрчихгүй бөгөөд уран бүтээлчийн сувгийн үзэлтийг өсгөдөг тул хуулийн дагуу 100% үнэгүй ашиглах хамгийн зөв арга юм.
   * **Олон нийтийн өмч (Public Domain Classics)**: Зохиогчийн эрх нь дууссан дэлхийн сонгодог кинонуудыг (жишээ нь: Чарли Чаплины бүтээлүүд, хуучны түүхэн алдартай бүтээлүүд) вэбсайтдаа үнэгүй байршуулан хэрэглэгчдийг татах.

---

## 6. Вэбсайтаас мөнгө олох арга замууд (Full Monetization Roadmap)

Энэхүү платформ нь бэлэн суурилагдсан системүүдтэй тул дараах 3 үндсэн загвараар тогтмол өндөр орлого олох бүрэн боломжтой:

### 1. Зар сурталчилгааны загвар (AVOD - Ad-Supported Video on Demand)
Хэрэглэгчдэд киног үнэгүй үзүүлж, оронд нь сурталчилгаа харуулах замаар ашиг олно:
* **Google AdSense холбох**: Вэбсайтын нүүр хуудас, хажуугийн хэсэг болон киноны тайлбар хэсэгт AdSense-ийн баннеруудыг байршуулна.
* **Дотоодын шууд баннер сурталчилгаа**: Монголын брэндүүд, сургалтын төвүүд эсвэл бизнесийн байгууллагуудтай хамтран ажиллаж, тэдний постер, баннерыг вэбсайтдаа тогтмол байршуулан сар бүр тогтмол хураамж авна. Вэбсайтад бэлэн реклам байршуулах функц тохируулагдсан байгаа.
* **Видео тоглуулагчийн видео сурталчилгаа**: Кино тоглуулагч дотор тоглуулах товч дарахаас өмнө (Pre-roll) эсвэл дундуур (Mid-roll) богино хэмжээний видео сурталчилгаа (VAST/VPAID стандарт) харуулж маш өндөр орлого олох боломжтой.

### 2. Сар бүрийн гишүүнчлэлийн хураамж (SVOD - Subscription Video on Demand)
* **Премиум багц (Premium VIP Pass)**: Хэрэглэгчдэд хамгийн шинэ, өндөр чанартай кинонуудыг зөвхөн "Premium" эрхтэйгээр үзүүлнэ.
* **Суурилуулсан төлбөрийн систем**: Хэрэглэгчид сард жишээ нь **10,000 ₮** төлж VIP эрх авах бөгөөд QPay эсвэл банкны шилжүүлгээр шилжүүлж, өөрийн төлбөрийн кодоор системд автоматаар эсвэл админы баталгаажуулалтаар эрхээ нээлгэнэ.
* **Stripe автоматжуулалт**: Олон улсын үзэгчид шууд кредит картаа уншуулан сарын эрхээ секунд хүрэхгүй хугацаанд идэвхжүүлэх боломжтой.

### 3. Нэг удаагийн түрээсийн загвар (TVOD - Transactional Video on Demand)
* **Кино Түрээслэх (Pay-Per-View)**: Univision, SkyMedia шиг шинээр гарсан Монгол кинонуудыг сарын гишүүнчлэлгүйгээр, зөвхөн тухайн киног үзэхийн тулд нэг удаагийн түрээсийн хураамж (жишээ нь: **3,000 ₮ - 5,000 ₮**) төлдөг систем тохируулах.
* Үзэгч киног худалдаж авснаас хойш 48 цагийн хугацаанд хязгааргүй үзэх эрхтэй болох байдлаар Supabase дээр хугацааг тохируулж өгөх боломжтой.

---

## 7. Төгсгөл (Conclusion & Sales Message)

**moncone.online** бол зөвхөн энгийн вэбсайт биш, хамгийн сүүлийн үеийн сервергүй (Serverless) технологи дээр суурилсан, **сар бүр ямар ч сервер, өгөгдлийн сангийн тогтмол зардал гаргадаггүй (0₮ Cost)**, маш хурдан хугацаанд олон сая хэрэглэгчдэд зэрэг хүрч чадах хүчирхэг дижитал платформ юм.

Тус төслийг Flippa болон бусад платформ дээр худалдахад хөрөнгө оруулагчид болон худалдан авагчид түүний хямд ажиллагааны зардал болон бэлэн Native Android аппликейшныг маш өндрөөр үнэлэх бөгөөд та өөрийн бүтээлийг **хамгийн дээд үнээр, нүүр бардам зарж ашиг олох бүрэн боломжтой!**
