# Lift Log

A workout tracker you install on your phone from the browser. It tracks lifts, splits, streaks and progress, and it stays free:

- **Supabase** (free plan) handles accounts, the database and motivation clips
- **GitHub Pages** (free) hosts the app

Every person who opens the link makes their own account, and their data is private to them.

---

## One-time setup (about 20–30 minutes)

### 1. Create the database (Supabase)

1. Go to **supabase.com**, sign up, then click **New project**.
   - Name: `lift-log`
   - Database password: anything strong. You won't need it for the app.
   - Region: **East US**
2. Wait about 2 minutes for the project to finish setting up.
3. In the left sidebar open **SQL Editor** and click **New query**. Paste everything in `schema.sql`, then click **Run**. You should see "Success. No rows returned."
4. Turn off email confirmation so friends can sign up and start right away:
   - **Authentication → Sign In / Providers → Email**, switch **Confirm email** off, then **Save**.
   - Why: the free plan only sends a handful of emails per hour.
5. Get your two keys from **Project Settings → API Keys**:
   - **Project URL**, which looks like `https://abcdefghijklm.supabase.co` (it's also under **Data API**)
   - **Publishable key**, which starts with `sb_publishable_`. If your project only shows "anon", use that one.
6. Open `config.js` and paste both values where it says `YOUR_SUPABASE_URL` and `YOUR_PUBLISHABLE_KEY`.
   > Only the publishable / anon key goes in the app. Never use the **secret** (service_role) key.

### 2. Put the app online (GitHub Pages)

1. Go to **github.com**, sign up, then click **New repository**.
   - Name: `lift-log`
   - Visibility: **Public**. Pages is free for public repos. This makes the code public, but nobody's data is in it.
   - Click **Create repository**.
2. On the new repo page click **uploading an existing file**. Drag in **everything in this folder**, including the `icons` and `vendor` folders and the `.nojekyll` file. Then click **Commit changes**.
3. Go to **Settings → Pages**. Under "Build and deployment" choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. After 1–2 minutes your app is live at:
   **`https://YOUR-GITHUB-USERNAME.github.io/lift-log/`**

### 3. Tell Supabase where the app lives

**Authentication → URL Configuration:**

- **Site URL**: your GitHub Pages address from step 2
- **Redirect URLs**: add the same address

Password-reset emails use these to send people back to the app.

### 4. Install it on your phone

Open the link, create your account, then:

- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** ⋮ → **Add to Home screen** or **Install app**

It opens full-screen with its own icon, like any app.

---

## Friends

Send them the link. They tap **Create account**, then add it to their home screen. Each person only ever sees their own workouts, splits and clips.

## Keeping it free

| Free plan limit | What it means here |
|---|---|
| 500 MB database | Workout logs are tiny. This lasts years, even with several friends. |
| 1 GB file storage | This is shared by everyone's motivation clips, roughly 40–50 short videos in total. |
| Pauses after 7 days of no use | If nobody opens the app for a week, Supabase pauses the project. Your data is kept. Log in to supabase.com and click **Restore project**. |

## How your data is stored

- Every workout, split day and setting is one row in the `docs` table. Row-level security means each person can only read or change their own rows.
- The app also keeps a copy on each device. That lets it open instantly and keep working at the gym with no signal. Anything logged offline syncs as soon as you're back online.
- **Account → Copy all my data** gives you a full backup any time. **Import backup** restores it, and also brings in data from the Claude version.

## Updating the app

Replace the changed files in the GitHub repo (Add file → Upload files → Commit). Phones pick up the new version the next time the app is opened online.
