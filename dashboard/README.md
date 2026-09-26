# PureNutrix Dashboard — Amazon · Flipkart · Meesho ek jagah

Phone aur computer par chalne wala dashboard. Roz subah **n8n** seller panels ko
**sirf padhta hai** aur dashboard update kar deta hai. Kuch gadbad ho (return
badhe, stock kam ho, login expire ho, data na aaye) to n8n Telegram par message bhejta hai.

Sab kuch aapke **Mac par** chalta hai:

```
 06:30  n8n ──► panel-reader ──► "PureNutrix Chrome" (aapka logged-in Chrome profile)
                                   Amazon · Flipkart · Meesho  (sirf padhna)
          └──► page ka text ──► Dashboard (queue)
 07:18  Claude app (aapka Claude plan, koi API key nahi) ──► queue padh kar orders/returns/payments
                                   nikaalta hai ──► dashboard update + jaanch ka record
 har 3 ghante / Somvaar / 1 tareekh:  n8n ──► alerts & reports ──► Telegram (bot jodne ke baad)
```

Agar kabhi `.env` me `ANTHROPIC_API_KEY` daal do, to dashboard pages turant khud padh lega (Claude app ka intezaar nahi).

## Screens

| Tab | Kya dikhata hai |
|---|---|
| 🏠 Aaj | Orders, Bikri, Asli Munafa, Return % — bade number, green/yellow/red. Alerts, platform-wise, stock kam, data kab aaya, **n8n ki roz ki jaanch** |
| 📦 Orders | Rozana orders aur bikri ka chart (7/30 din) |
| ↩️ Returns | Return + RTO % har platform ka, normal se tulna, kaunse product, wajah |
| 💰 Paisa | Customer ne diya → GST, fees, shipping, ads, maal ki keemat kat kar **asli munafa** |
| 📊 Stock | Har product ka stock, kitne din chalega, kharide maal ka paisa jo sales se apne aap ghat-ta hai |
| 🏆 Products | Sabse zyada kamai wale se nuksaan wale tak |
| 📣 Ads | Amazon / Flipkart ads: kharch vs bikri (ROAS, ACoS) |
| ⭐ Reviews / 🏷️ Competitors | Apni rating aur competitor ka price (n8n roz padhta hai) |
| 🏦 Cash flow | Kaunsa payment kab aaya, kitna aana baaki hai |
| 📝 Report | Hafte / mahine ki report aam bhasha me (n8n Telegram par bhi bhejta hai) |
| ⚙️ Data | n8n status, file upload (backup), SKU milao, jaanch ka record |

## Setup — kya ho chuka hai, kya baaki hai

✅ n8n install, account, dono workflows chalu · ✅ PureNutrix Chrome me teeno panels login ·
✅ panel pages ke sahi address (26 Sep ko check kiye) · ✅ Claude app ka roz 7:18 wala kaam · ✅ Mac restart par sab apne aap chalu

Baaki (sirf aap kar sakte ho):
1. **Telegram bot** (alerts phone par chahiye to) — neeche 5 minute ke steps. Token n8n credential
   **"PureNutrix Telegram Bot"** me daalo, phir chat id batao / workflows me `APNA_TELEGRAM_CHAT_ID` badlo.
2. **Purchase bill** — 📊 Stock → "Naya maal aaya" (iske bina stock "Purchase bill daalo" dikhata hai).
3. **SKU milao** — Meesho ke SKU (jaise `U5OB7oiq`) ko apne asli SKU se jodo: ⚙️ Data → "SKU milao".
4. Claude app me task **"PureNutrix — n8n ke pages padh kar dashboard bharo"** ko ek baar **Run now** karke
   permissions de do, taaki roz bina ruke chale.

Login expire ho jaye to: `scripts/panel-login.sh` chala kar us panel me dobara login.

### Telegram bot (5 minute)
1. Telegram me **@BotFather** → `/newbot` → naam do → **token** milega → n8n credential "PureNutrix Telegram Bot".
2. Apne bot ko koi bhi message bhejo.
3. Browser me `https://api.telegram.org/bot<TOKEN>/getUpdates` kholo → `"chat":{"id": ...}` wala number = chat id.

## Roz kya hota hai

| Samay | n8n workflow | Kaam |
|---|---|---|
| Roz 6:30 | n8n: PureNutrix — roz subah panel se data | Panels ke pages padh kar dashboard ki queue me daalna |
| Roz 7:18 | Claude app: PureNutrix — n8n ke pages padh kar dashboard bharo | Queue ke pages se orders/returns/payments nikaal kar dashboard update + jaanch record |
| Har 3 ghante | PureNutrix — alerts aur reports | Naye alerts (stock kam, return badhe, data purana) Telegram par |
| Somvaar 9 baje | 〃 | Hafte ki report |
| Har mahine 1 tareekh | 〃 | Mahine ki report |

**n8n kya kabhi nahi karta:** order accept/cancel, label print, price/stock/ads badalna, reply, kuch delete.
Sirf pages kholta aur padhta hai. Captcha aaye to use hal nahi karta — "khud login karo" message deta hai.

Zaroori: Mac on ho aur user logged-in ho (Mac so raha ho to jaagne par chalega). Login kabhi expire ho to
Telegram par "Login karna padega" aayega → `scripts/panel-login.sh` chala kar dobara login kar do.

**Page ka pata (URL) badal jaye** ya n8n "page samajh nahi aaya" bole: n8n me node **"Pages ki list"** me
URL theek karo (ya `n8n/build_workflows.py` me `PAGES` badal kar dobara import).

## Kharcha

- n8n, dashboard, panel-reader: free (aapke Mac par).
- Pages padhna: aapke Claude app ke plan se (koi alag kharcha nahi). Claude app aur Mac 7:18 par khule/on hone chahiye;
  band the to agli baar app khulte hi chalega, aur 6 ghante tak queue na padhi jaye to alert aata hai.
- Optional: `.env` me `ANTHROPIC_API_KEY` daaloge to Claude API se turant padhega (model `EXTRACT_MODEL`, alag bill).

## Backup: file upload

n8n se kuch chhoot jaye to seller panel se report download karke ⚙️ Data me daal do — dashboard khud
pehchaan leta hai kaunsi report hai, aur double count nahi hota. (Kaunsi report kahan milti hai — Data tab me likha hai.)

## Numbers kaise bante hain

- **Bikri** = customer ne jo diya, cancel aur return/RTO hata ke.
- **Asli munafa** = bikri − GST (price ke andar ka) − marketplace fees − shipping − baaki kataut − ads − maal ki keemat.
- **Fees** payment pages/report se aati hain. Jo order abhi settle nahi hue, unki fees pichhle 120 din ke hisaab se
  **andaza** lagti hai (screen par likha aata hai).
- **TCS/TDS** dikhaya jaata hai par munafa se nahi ghataya — wo tax return me wapas milta hai.
- **Maal ki keemat:** FIFO — pehle kharida maal pehle bikta hai. RTO / sellable return wapas stock me.
  Purchase cost **GST ke bina** daalo agar GST credit lete ho.
- **Stock** = kharida − bika + wapas aaya. Bina purchase bill ke bike units **minus stock** dikhte hain.
- Deepakriti (SKU `DC-`) ko chhod kar sab gina jaata hai — Meesho par PureNutrix ke SKU `PN-` se shuru nahi hote. `.env` me `SKU_FILTER_REGEX`.

## Phone par dekhna

Ghar ke Wi-Fi par phone se: `http://<Mac ka IP>:8765` (Mac: System Settings → Wi-Fi → Details → IP address).
Password wahi jo `.env` me `DASHBOARD_PASSWORD`. Ghar ke bahar se dekhna ho to Tailscale jaisa private
tunnel lagana padega (bata dena, set kar denge).

## Dhyaan rakhne wali baatein

- Kya nahi milta: Flipkart par order date (dispatch date li jaati hai); Meesho cancelled orders ki date/price;
  Amazon payouts (poore account ke hain, Deepakriti mila hua). Flipkart ads ka **pichhle 7 din ka total** (kharch,
  revenue, ROI) roz Flipkart panel ke Ads section se aata hai (alag login nahi); rozana ka breakup aur Amazon ads ke
  liye report file upload karo.
- Amazon/Flipkart ka official API wala system hata diya gaya hai (code `archive/api_connectors/` me rakha hai,
  kabhi chahiye to wapas jod sakte hain).
- Claude app sirf n8n ke laaye text ko padhta hai — wo khud koi website nahi kholta.

---

## Developer notes

```
scripts/start-all.sh | stop-all.sh | panel-login.sh | install-autostart.sh
.venv/bin/python -m pytest -q
python3 n8n/build_workflows.py      # regenerate n8n workflow JSON
n8n/runtime/node_modules/.bin/n8n import:workflow --input=n8n/purenutrix-daily.json
```

```
app/
  main.py        FastAPI: login, dashboard JSON API, uploads, /api/agent/* for n8n (Bearer AUDIT_TOKEN)
  extract.py     page text from n8n -> Claude structured output -> audit.ingest(); per-run audit roll-up
  audit.py       snapshot + validated ingest + audit_runs log
  alerts.py      alert rules; pending_message()/mark_sent() for n8n delivery
  inventory.py   FIFO stock & purchase pool          metrics.py  all numbers + plain-language reports
  ingest/        report-file parsers (backup path) + normalising writers
panel-reader/    Node service (127.0.0.1:3100) driving the "PureNutrix Chrome" profile via CDP (read-only)
n8n/             workflow JSON (+ generator), n8n runtime installed under n8n/runtime
static/          no-build HTML/CSS/JS frontend
archive/         parked API connectors
```

n8n endpoints: `GET /api/agent/snapshot`, `POST /api/agent/page` `{platform, page_kind, day, url, text|error, listing_id?}`,
`POST /api/agent/finish`, `GET /api/agent/alerts`, `POST /api/agent/alerts/sent`, `GET /api/agent/report?kind=week|month`,
`POST /api/agent/upload`.
