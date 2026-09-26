# Dashboard ko cPanel par chalana (dashboard.purenutrix.in)

Pehli baar (ek hi baar):
1. cPanel → **Domains** → subdomain `dashboard.purenutrix.in` banao.
2. cPanel → **Setup Python App** → Create Application:
   - Python version: 3.9 ya usse naya
   - Application root: `purenutrix-dashboard`
   - Application URL: `dashboard.purenutrix.in`
   - Application startup file: `passenger_wsgi.py` · Entry point: `application`
3. Mac par bana `dist/purenutrix-dashboard-deploy.zip` (isme `.env` aur data hai — GitHub par kabhi mat daalna)
   cPanel **File Manager** se `purenutrix-dashboard` folder me upload karke **Extract** karo.
4. Setup Python App me app kholo → **Run Pip Install** (`requirements.txt`) → **Restart**.
5. `https://dashboard.purenutrix.in` kholo → password se login.

Uske baad har update: GitHub `main` par merge → cPanel **Git Version Control → Deploy HEAD Commit**.
`.cpanel.yml` sirf code copy karta hai; server ki `.env` aur `data/` safe rehti hai.

Mac par: `.env` me `DASHBOARD_URL=https://dashboard.purenutrix.in` jodo, aur n8n workflow naye pate se dobara banao:
`PN_DASHBOARD_URL=https://dashboard.purenutrix.in python3 n8n/build_workflows.py` → n8n me import.
