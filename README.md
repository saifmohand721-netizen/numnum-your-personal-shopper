# NumNum: Your Personal Shopper

Design and build an extraordinarily modern, high-end, and ultra-responsive Web Application called "نم نم" (NumNum) - a premium personal purchasing & delivery service ("نشتري ونوصل لك أي شيء").



​🎨 1. BRANDING & COLOR PALETTE ​Name: "نم نم" (NumNum). ​Vibe: Energetic, friendly, trustworthy, and sleek. ​Primary Color: Vibrant Warm Orange/Coral (#FF5722 or #FF6B00) representing energy and fast service. ​Secondary/Accent Color: Rich Emerald/Forest Green (#10B981) representing trust and order confirmation. ​Dark Backgrounds/Accents: Charcoal Grey/Slate (#0F172A). ​Neutral Light Background: Soft Warm Off-White (#F9FAFB / #F3F4F6) with crisp white card containers (#FFFFFF). ​Typography: Arabic First design using high-quality modern fonts (e.g., 'Tajawal', 'Cairo', or 'Rubik'). Default layout direction MUST be Right-To-Left (RTL). ​📱 2. USER INTERFACE & EXPERIENCE (UI/UX DETAILS) 



​A. Header / Top Navigation Bar



​App Title/Logo: "نم نم" with a playful delivery box icon. ​Location Indicator: Small badge showing current area (e.g., "توصيل إلى: منزلك / المنطقة الحالية"). ​Quick Install Banner (PWA Floating Prompt): Soft animated bar at the top or bottom asking: "لطلب أسرع وتجربة أفضل، ثبّت تطبيق نم نم على شاشتك الرئيسية" with an "إضافة / تثبيت" button and a dismiss X. 



​B. Hero Section / Categories Grid



​Eye-catching banner with tagline: "نم نم .. نشتري لك كلشي ونوصله لباب بيتك!" ​Interactive Category Cards with subtle hover animations (Micro-interactions): ​🛒 البقالة والسوبرماركت (Groceries) ​🛠️ الانشائية والعدد (Hardware & Supplies) ​💊 الصيدلية والمستلزمات (Pharmacy) ​📦 طلب خاص / أي شيء آخر (Custom Request) 



​C. Smart Order Request Form (Dynamic & Multi-step)



​An intuitive, step-by-step form:



​اختيار نوع المتجر (Store Category). ​قائمة الأغراض المطلوبة (Dynamic Textarea with bullet points, auto-expanding, and voice note placeholder mock UI). ​عنوان التسليم (Delivery Address text field + optional "تحديد على الخريطة" mock button). ​رقم الهاتف للتأكيد (Phone input with Iraqi flag/country code default). ​ملاحظات الميزانية (Optional budget cap, e.g., "حد أقصى للمشتريات: 50,000 د.ع"). ​CTA Button: Large, bold "تأكيد وإرسال الطلب لـ نم نم 🚀" with smooth click animation. 



​D. Live Order Tracking Modal / Screen (Real-time Feel)



​When an order is submitted, transition to a tracking screen showing live progress steps:



​📝 تم استلام الطلب (Order Received) ​🛒 جاري الشراء من المتجر (Buying Items) ​🛵 نم نم في الطريق إليك (Out for Delivery) ​✅ تم التسليم بنجاح (Delivered) ​Include order breakdown summary: (سعر المشتريات التقديري + كلفة التوصيل + المجموع الكلي). ​🛡️ 3. DRIVER / ADMIN PANEL (Protected View) ​Accessible via a toggle or route (/driver or PIN modal). ​Dark/Slate Dashboard mode for driver night shifts. ​List of active orders with filters (جديد، قيد الشراء، جاري التوصيل، مكتمل). ​Input fields for drivers to enter the exact purchase price from the store receipt + delivery fee, automatically calculating the total bill for the customer. ​⚡ 4. BACKEND & DATABASE INTEGRATION (Supabase Integration) ​Connect and configure Supabase backend directly within Lovable. ​Automatically generate the orders database table schema containing: ​id (UUID, primary key) ​customer_phone (Text) ​store_type (Text) ​items_list (Text) ​delivery_address (Text) ​budget_limit (Numeric/Text) ​status (Text: 'pending', 'buying', 'delivering', 'completed', default: 'pending') ​purchase_price (Numeric) ​delivery_fee (Numeric) ​total_price (Numeric) ​created_at (Timestamp) ​Enable Supabase Realtime Subscriptions on the orders table so new orders appear on the Driver Panel instantly without refreshing the page. ​🌐 5. DEPLOYMENT & PRODUCTION PREPARATION (Hosting & PWA) ​Ensure full PWA manifest (manifest.json) and Service Worker setup for optimal mobile installation on iOS and Android. ​Prepare the application structure for direct deployment (One-Click Publish) onto cloud hosting servers (Vercel or Netlify) with automated SSL encryption and custom domain readiness. 



​Make the UI look world-class, clean, buttery smooth, with rounded corners (rounded-2xl), subtle shadows (shadow-sm & shadow-xl), glassmorphism effects for floating cards, and full mobile-first responsiveness!

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ad4865de-1a09-46b6-9e77-ee6089c5629e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
