# AnalystOS Public Cloud Deployment Guide 🚀

This guide provides step-by-step instructions on how to publish the **AnalystOS Terminal** and secure Node.js backend permanently to the cloud for free, so that **everyone in the world** can access it 24/7.

We recommend **Render.com** for full-stack Node.js + Express hosting, as it natively handles both static HTML pages and backend API routes seamlessly.

---

## Method 1: Host Permanently on Render.com (Recommended)

Render is a free cloud platform that connects directly to your GitHub repository and automatically redeploys your site every time you push code changes.

### Step 1: Create a GitHub Repository
1. Go to [github.com](https://github.com) and log in.
2. Click the **New** repository button.
3. Name it `analystos` or `analystos-terminal`, set it to **Private** or **Public**, and click **Create repository**.
4. In your local project terminal, initialize Git, commit the files, and push them:
   ```bash
   git init
   git add .
   git commit -m "feat: configure production architecture and port 3000 mapping"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/analystos.git
   git push -u origin main
   ```
   *(Note: The `.gitignore` file is already pre-configured to ensure your `.env` secrets and `node_modules` are NEVER uploaded to GitHub.)*

### Step 2: Set Up Render Web Service
1. Go to [render.com](https://render.com) and create a free account.
2. Click **New +** in the top dashboard and select **Web Service**.
3. Select **Connect Git Repository** and choose your `analystos` repository.
4. Fill in the configuration details:
   - **Name:** `analystos` (or any name you prefer)
   - **Region:** Choose the region closest to your users (e.g., Singapore for Asia/India)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`

### Step 3: Add your Secure Claude API Key
1. Scroll down and click the **Advanced** button.
2. Click **Add Environment Variable** and enter:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-api03-...` (your active Anthropic API key)
3. Click **Create Web Service**.

Render will now pull your code, install dependencies, compile the optimized Three.js 3D assets into `/dist`, startup the secure Express server, and give you a public URL like:
👉 **`https://analystos.onrender.com`**

---

## Method 2: Instant Temp Expose (No Setup Required)

If you just want to quickly demo your local machine's website to someone else on the internet:

1. Double-click the **`Launch-AnalystOS.bat`** file to start the server locally.
2. Double-click the **`Share-Publicly.bat`** file.
3. The script will generate a secure, temporary public URL:
   👉 **`https://xxxx.loca.lt`**
4. Send this link to anyone in the world! They will be able to access the site and test the interactive Three.js 3D animations and live AI console directly from your local machine.

---

## Method 3: Share Over Local Wi-Fi Network

If you want to view the site on your phone, tablet, or another laptop connected to the same Wi-Fi:

1. Open a Command Prompt on your computer, type `ipconfig`, and find your **IPv4 Address** (usually looks like `192.168.1.XX`).
2. Boot the server using `Launch-AnalystOS.bat`.
3. Open the browser on your other device and type:
   👉 **`http://192.168.1.XX:3000`**
4. It will immediately load the fast, high-performance web experience!
