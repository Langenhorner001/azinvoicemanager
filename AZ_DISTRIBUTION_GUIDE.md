# AZ DISTRIBUTION — Invoice Manager
### Mukammal Guide (Complete User Guide)

**Developed by:** sonic
**Version:** 1.0.0
**Platform:** Web Application (React + Node.js)
**Contact:** +92 318 4396075 | Mirpur Azad Kashmir, 12130

---

## ⚠️ DISCLAIMER — Zaroori Itlaa

> **Yeh software sirf jaiz (legal) tijaarti maqasid ke liye banaya gaya hai.**
>
> Is software ke zariye agar koi ghair-qanooni kaam kiya jaye — jaise nakli (fake) invoice banana, tax fraud, dhokha dahi, ya kisi bhi qisam ka maali jurm — to **author "sonic" iski koi qanooni ya maali zimmedari nahi lega.**
>
> Use karne wala khud apne tamam aamaal ka zimmedar hoga. Pakistan ke qanoon ke mutabiq jaalsazi (forgery) ek sangeen jurm hai.

**THIS SOFTWARE IS PROVIDED "AS IS". THE AUTHOR "sonic" SHALL NOT BE LIABLE FOR ANY ILLEGAL, FRAUDULENT, OR UNAUTHORIZED USE OF THIS SOFTWARE. THE USER ASSUMES FULL RESPONSIBILITY FOR ALL ACTIONS PERFORMED USING THIS TOOL. USE AT YOUR OWN RISK.**

---

## 📋 Yeh Project Kya Hai?

**AZ DISTRIBUTION Invoice Manager** ek mukammal web-based invoice management system hai jo khaas tor par **AZ DISTRIBUTION MIRPUR** ke liye banaya gaya hai. Yeh aik local business hai jo Mirpur Azad Kashmir, Pakistan mein hai.

Yeh application kaarobari (business) malikan ko apne customers ke liye professional invoice banane, save karne, aur print karne mein madad deti hai — bina kisi kaaghaz ya alag software ke.

---

## ✅ Khasusiyat (Features)

| Feature | Tafseel |
|---------|---------|
| **Invoice Banana** | Naya invoice banayein — number khud-ba-khud (AZ-YYMM-###) |
| **Live Preview** | Jaise form bharein, dahini taraf A4 invoice khud update ho |
| **Customer Management** | Customers ki list — add karein, change karein, delete karein |
| **Product Management** | Items ki list — naam aur qeemat save karein |
| **Discount** | Har item per discount (% mein) — on/off switch |
| **Draft** | Invoice ko draft ke tor par save karein |
| **Auto-Save** | Type karte hi draft khud-ba-khud save hota hai |
| **Search** | Invoice number ya customer ke naam se talash |
| **Print / PDF** | Invoice print karein ya PDF banayein |
| **Dark Mode** | Aankhon ke liye aaraam-deh dark theme |
| **Mobile Friendly** | Mobile per bhi bilkul theek chalta hai |

---

## 🚀 Istemal Ka Tareeqa (How to Use)

### 1. Pehla Qadam — Customer Add Karein
1. Bayein (left) sidebar se **Customers** par click karein
2. **"Add Customer"** button dabayein
3. Customer ka naam aur address likhein
4. **"Add Customer"** par click karein — customer save ho gaya

### 2. Doosra Qadam — Product Add Karein
1. Sidebar se **Products** par click karein
2. **"Add Product"** button dabayein
3. Product ka naam aur default qeemat likhein
4. **"Add Product"** par click karein — product save ho gayi

### 3. Teesra Qadam — Naya Invoice Banayein
1. Sidebar se **Invoices** par click karein
2. Upar dahini taraf **"New Invoice"** button dabayein
3. Invoice number khud-ba-khud aayega (jaise AZ-2605-001)
4. Date select karein
5. Customer select karein ya naam khud likhein
6. Item add karein:
   - **Item Name**: Product select karein ya khud likhein
   - **Qty**: Tadaad (quantity) likhein
   - **Price**: Qeemat likhein (Rs.)
   - **Discount**: Agar discount dena ho to switch on karein aur % likhein
7. Dahini taraf live A4 preview dekhein
8. **"Save Invoice"** — final invoice save karein
   ya **"Save Draft"** — baad mein mukammal karein

### 4. Invoice Print / PDF Karein
- Invoice kholein ya banayein
- Upar **"Print"** button dabayein — sirf invoice print hoga (sidebar nahi)
- **"PDF"** button dabayein — PDF save karne ka option aayega

### 5. Invoice Talash Karein
- Invoices page par search box mein invoice number ya customer ka naam likhein
- Nataij (results) foran filter ho jayenge

### 6. Invoice Delete Karein
- Invoice ki row par mouse le jayein
- Surkh (red) **Delete** button dabayein
- Tasdeeq (confirm) karein — invoice delete ho gaya

### 7. Dark Mode
- Sidebar ke neeche **"Dark Mode"** button dabayein
- Dobara dabayein to light mode mein aa jayega
- Tarjeeh (preference) khud-ba-khud save rehti hai

---

## 💡 Invoice Number Format

```
AZ - YY MM - ###
AZ - 26 05 - 001
     ↑  ↑    ↑
     saal  mahina  number
```

- Har mahine naya silsila shuru hota hai
- Khud-ba-khud barhta jata hai
- Aap chahein to khud bhi badal sakte hain

---

## 🌐 Deploy Karne Ka Tareeqa

### Option 1 — Replit Per Deploy (Sab Se Asaan)
1. Replit per project kholein
2. Upar dahini taraf **"Deploy"** button dabayein
3. **"Production Deploy"** select karein
4. Chand (kuch) minton mein aap ki app live ho jayegi
5. Aap ko ek link milega jaise: `https://az-distribution.replit.app`
6. Yeh link kisi bhi device per khul sakta hai

### Option 2 — VPS Ya Apne Server Per
**Zaroriat:**
- Node.js 20+
- PostgreSQL database
- pnpm package manager

```bash
# 1. Project download karein
git clone <your-repo-url>
cd az-distribution-invoice-manager

# 2. Packages install karein
pnpm install

# 3. Environment variables set karein
echo "DATABASE_URL=postgresql://user:password@localhost:5432/az_db" > .env

# 4. Database setup karein
pnpm --filter @workspace/db run push

# 5. API server chalayein
pnpm --filter @workspace/api-server run dev

# 6. Frontend chalayein
pnpm --filter @workspace/invoice-manager run dev
```

### Option 3 — Local Istemal (Ghar/Office)
Agar aap sirf apne computer per chalana chahte hain:
1. Node.js install karein: [nodejs.org](https://nodejs.org)
2. PostgreSQL install karein
3. Upar diye gaye commands chalayein
4. `http://localhost:18864` per app khulegi

---

## 📱 Kahan Kahan Chalta Hai?

| Device | Support |
|--------|---------|
| Computer / Laptop | ✅ Mukammal |
| Tablet | ✅ Mukammal |
| Mobile Phone | ✅ Mukammal |
| Chrome | ✅ |
| Firefox | ✅ |
| Safari | ✅ |
| Edge | ✅ |

---

## ✅ Faiday (Benefits & Advantages)

### Kaarobari Faiday
- **Waqt Ki Bachat** — Invoice minton mein tayyar, kaaghaz aur qalam ki zaroorat nahi
- **Professional Invoice** — Har invoice saaf, print ke qaabil A4 format mein
- **Ghalti Kam** — Khud-ba-khud hisaab — jama, discount, grand total sab khud nikalta hai
- **Customer Ka Record** — Tamam customers ki maloomat ek jagah save
- **Product Catalogue** — Items ki list — baar baar likhne ki zaroorat nahi
- **Invoice History** — Purane invoice asaani se dhoondhein
- **Draft System** — Adhoora invoice save karein — baad mein mukammal karein
- **Auto-Save** — Kaam zaya nahi hoga — khud-ba-khud save hota rehta hai
- **Muft (Free) PDF** — Alag software ki zaroorat nahi
- **Dark Mode** — Raat ko kaam karein, aankhon ko takleef nahi

### Technical Faiday
- **Web Based** — Koi installation nahi, bas link kholein
- **Mehfooz (Secure) Data** — PostgreSQL mein data save
- **Tez Raftar (Fast)** — React + Node.js se bana hua — bohot tez chalta hai
- **Muft Deployment** — Replit ke saath muft mein online karein

---

## ⚠️ Nuqsanat / Hudood (Limitations)

### Mojooda Hudood
- **Internet Zaroori** — Online system hai, bina internet kaam nahi karta (jab tak local install na karein)
- **Koi Login Nahi** — Abhi koi user account system nahi — ek kaarobar ke liye bana hai
- **Multi-Currency Nahi** — Sirf Rupay (Rs.) mein kaam karta hai
- **Invoice Template** — Filhal ek hi tarah ka invoice design hai
- **Tax Hisaab Nahi** — GST ya doosre tax ka alag khana nahi (discount hai, tax nahi)
- **Invoice Status Nahi** — Ada-shuda / na-ada-shuda (paid/unpaid) ka abhi nishaan nahi
- **Data Backup** — Khud se database backup ka intezam karna hoga
- **Reporting Nahi** — Mahana ya saalana report ki sahoolat abhi nahi

### Technical Hudood
- **Single User** — Aik waqt mein aik user ke liye munasib
- **Offline Kaam Nahi** — Database connection zaroori hai
- **PDF Download** — Direct PDF download nahi, balke browser ke Print → Save as PDF se kaam karta hai

---

## 🛠️ Technical Dhaancha (Stack)

```
Frontend  :  React 19 + Vite + Tailwind CSS + shadcn/ui
Backend   :  Node.js + Express (Fastify) + Drizzle ORM
Database  :  PostgreSQL (Neon)
API       :  REST API — OpenAPI Spec + Orval Codegen
Fonts     :  Inter (UI) + Dancing Script (Cursive footer) + Playfair Display
Routing   :  Wouter (client-side)
State     :  TanStack Query (server state)
```

---

## 📁 File Dhaancha (Project Structure)

```
az-distribution/
├── artifacts/
│   ├── api-server/        ← Backend server (Node.js)
│   │   └── src/routes/   ← API endpoints
│   └── invoice-manager/  ← Frontend (React)
│       └── src/
│           ├── pages/    ← Tamam pages
│           └── components/ ← Re-usable components
├── lib/
│   ├── db/               ← Database schema
│   └── api-client-react/ ← Khud-kaar (auto) API hooks
└── AZ_DISTRIBUTION_GUIDE.md ← Yeh file
```

---

## 🔧 Environment Variables

| Variable | Wazahat | Misaal |
|----------|---------|--------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `PORT` | API server port | `8080` |
| `BASE_PATH` | Frontend base path | `/` |

---

## 🆘 Aam Masail Aur Hal (Troubleshooting)

| Masla | Hal |
|-------|-----|
| App nahi khulti | Check karein API server chal raha hai ya nahi |
| Invoice save nahi hota | Tamam zaroori khaane bharein (number, date, customer) |
| Print mein sidebar aata hai | Print button hi use karein (Ctrl+P nahi) |
| Data zaya ho gaya | DATABASE_URL sahi hai ya nahi check karein |
| Product nahi milta | Pehle Products page per add karein |

---

## 📞 Rabita (Contact)

**AZ DISTRIBUTION**
Mirpur Azad Kashmir, 12130
+92 318 4396075

**Developed by:** sonic
**Framework:** Built on Replit

---

## 📜 License

Yeh software sirf AZ DISTRIBUTION ke zaati kaarobari istemal ke liye hai.
Bina ijazat taqseem (distribute) ya farokht (sell) karna mamnoo (forbidden) hai.

---

*Last Updated: May 2026*
*Author: sonic*
