# Northfield — Blog & Article Publishing Platform

A complete, framework-free blog platform: HTML5 + CSS3 + vanilla JavaScript on the
front end, Firebase (Auth, Firestore, Storage) on the back end. One owner/admin
account manages articles; visitors browse, search and read for free, with no
account required.

## File structure

```
index.html          Homepage (hero, latest, popular, categories, search)
category.html        /category/:slug — published articles in one category
article.html          /article/:slug — full reading page, SEO tags, JSON-LD
admin.html            Owner login + dashboard + article editor (single page)
css/styles.css        Shared design system (light + dark themes, all pages)
js/firebase-config.js Firebase v10 modular SDK init — paste your config here
js/utils.js            Shared helpers: sanitizer, toasts, theme, slugify, etc.
js/app.js               Homepage logic
js/category.js          Category page logic
js/article.js            Article page logic (view counting, related articles, SEO)
js/admin.js               Dashboard: auth guard, article table, categories, settings
js/editor.js               Rich text editor, image/thumbnail uploads, save/publish
firebase-rules/firestore.rules
firebase-rules/storage.rules
_redirects              Netlify rewrite rules for pretty /article/ and /category/ URLs
```

## 1. Create a Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com) and create a project.
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Authentication** → Users → add one user — this is your Owner/Admin login
   (email + password). The site treats *any* signed-in user as the Owner, so
   only create this one account.
4. **Firestore Database** → Create database (production mode is fine — the
   rules below lock it down).
5. **Storage** → Get started (default bucket is fine).
6. **Project settings** → General → "Your apps" → add a **Web app** → copy the
   `firebaseConfig` object.

## 2. Add your config

Open `js/firebase-config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "…",
  authDomain: "…",
  projectId: "…",
  storageBucket: "…",
  messagingSenderId: "…",
  appId: "…",
};
```

## 3. Deploy security rules

Using the Firebase CLI (`npm install -g firebase-tools`, then `firebase login`,
`firebase init` selecting Firestore + Storage for this project):

- Copy `firebase-rules/firestore.rules` → your project's `firestore.rules`, then run:
  `firebase deploy --only firestore:rules`
- Copy `firebase-rules/storage.rules` → your project's `storage.rules`, then run:
  `firebase deploy --only storage`

Or paste each file's contents directly into the **Rules** tab of Firestore and
Storage in the Firebase console — no CLI required.

**What the rules do:** anyone can read a `published` article or any category;
only your signed-in Owner account can create, edit, delete, publish or
unpublish articles, or upload images. A narrow exception lets a signed-out
visitor increment a published article's `views` field by exactly one, and
nothing else — that's what powers the view counter and Popular Articles
section without exposing writes generally.

Firestore will also need a few composite indexes for the site's queries
(status + publishedAt, status + views, status + category + publishedAt,
status + tags). `firebase-rules/firestore.indexes.json` defines them — deploy
with `firebase deploy --only firestore:indexes`, or simply click the link
Firestore prints in the browser console the first time a query needs one.

## 4. Categories

The first time you log into the dashboard, if no categories exist yet the app
automatically seeds the default set (Technology, AI, Programming, Education,
Blogging, Internet, Tips & Tricks, News, Other). Add, or remove your own
from **Dashboard → Categories** — a category can only be deleted once no
articles use it.

## 5. Run locally

This is a static site with ES modules, so it needs to be served over HTTP
(opening the files directly with `file://` will not work). Any static server
works, for example:

```
npx serve .
```

Then visit `http://localhost:3000` for the site and
`http://localhost:3000/admin.html` to log in as the Owner.

Pretty URLs (`/article/my-slug`, `/category/technology`) only work once
deployed to Netlify with the included `_redirects` file, or with `netlify dev`
locally. Every "Read more" link uses the always-working
`article.html?slug=my-slug` form, so the site functions correctly either way.

## 6. Deploy to Netlify

1. Push this folder to a Git repository (GitHub/GitLab/Bitbucket), or drag-and-drop
   the folder into Netlify's "Deploys" tab.
2. New site from Git → pick the repo → leave the build command empty and set
   the publish directory to the project root (where `index.html` lives).
3. Deploy. The included `_redirects` file automatically enables the pretty
   `/article/:slug` and `/category/:slug` URLs.
4. In Firebase console → Authentication → Settings → **Authorized domains**,
   add your Netlify domain (e.g. `your-site.netlify.app`) so login works in
   production.

## How the pieces fit together

- **Article content** is stored as sanitized HTML in Firestore (`articles/{id}.content`),
  preserving headings, bold/italic, lists, links, blockquotes, code blocks and
  inserted images in the exact order the Owner placed them. It's sanitized
  again on every render (a strict tag/attribute whitelist) before being shown
  to visitors, so no unexpected markup or scripts can reach the page.
- **Drafts** (`status: "draft"`) are only ever queried by the authenticated
  admin dashboard; every public-facing query (homepage, category, search,
  article page) explicitly filters `where("status", "==", "published")`, and
  the Firestore rules enforce that same boundary independently.
- **Views** increment once per browser session per article (`sessionStorage`
  guard) via a narrowly-scoped Firestore rule, so refreshing the page doesn't
  inflate the count.
- **Images**: the 16:9 thumbnail is a single upload used everywhere the
  article appears as a card (`object-fit: cover` keeps it uncropped-looking
  regardless of the source image's aspect ratio). In-article images are
  uploaded to Storage and inserted at the cursor as a `<figure>` with an
  optional caption, keeping their original aspect ratio.
- **SEO**: `article.html` sets the document title, meta description, canonical
  link, Open Graph + Twitter card tags, and an `Article` JSON-LD block
  dynamically from each article's fields once it loads.

## Notes & possible next steps

- The rich text editor uses `document.execCommand`, which is broadly supported
  across current browsers for this feature set but is a deprecated API; if you
  want long-term durability, consider swapping in a maintained editor (e.g.
  a small ProseMirror or Tiptap setup) behind the same toolbar markup.
- For extra protection against view-count abuse at scale, add
  [Firebase App Check](https://firebase.google.com/docs/app-check) to the
  project.
- Search is client-side (loads published articles and filters in the
  browser), which is simple and fast for a blog of a few hundred posts. For a
  much larger archive, consider a hosted search index (e.g. Algolia) fed by a
  Cloud Function on article publish.
