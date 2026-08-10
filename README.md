# Household Meal Plan

Pantry/fridge/freezer inventory, a shared recipe list (with comments and vote-to-remove), and a
multi-week meal plan linking meals to what's on hand. Replaces the old `Meal_Plan.xlsx`.

Static site (no build step) — GitHub Pages + Firebase (Firestore + Google sign-in), same approach
as [commander-deck-tracker](https://github.com/Pygrus/commander-deck-tracker).

## Setup

### 1. Firebase project
1. Go to [Firebase Console](https://console.firebase.google.com/) → Add project.
2. In the new project: **Build → Authentication → Get started → Sign-in method → Google → Enable**.
3. **Build → Firestore Database → Create database** (start in production mode; region close to you).
4. **Project settings (gear icon) → General → Your apps → Add app → Web (`</>`)**. Register the
   app (no need for Firebase Hosting). Copy the `firebaseConfig` object it gives you.
5. Paste those values into [`js/firebase-init.js`](js/firebase-init.js), replacing the
   `"REPLACE_ME"` placeholders.

### 2. Household allowlist
Only these two places control access — edit **both**:
- [`js/auth.js`](js/auth.js) — `ALLOWED_EMAILS` (used for the friendly "not authorized" screen)
- [`firestore.rules`](firestore.rules) — the actual enforcement (a client-side check alone isn't
  secure; this is what really blocks everyone else)

Add Dad's, Amaya's, and (if she wants in) Jennifer's Google account emails, lowercase, to both.

### 3. Deploy the security rules
No Firebase CLI needed — in Firebase Console: **Firestore Database → Rules**, paste in the
contents of `firestore.rules`, click **Publish**.

### 4. GitHub Pages
1. Create a new GitHub repo (e.g. `meal-plan-tracker`) and push this folder to it.
2. In the repo: **Settings → Pages → Source: Deploy from a branch → main → / (root)**.
3. Your site will be live at `https://<username>.github.io/<repo-name>/`.

### 5. Authorize your own domain for sign-in
Firebase Console → Authentication → Settings → **Authorized domains** → add your
`<username>.github.io` domain (localhost is already allowed by default).

## Data model (Firestore)

- **`recipes/{id}`** — `name, category, status, suggestedBy, notes, ingredients[], votesToRemove[]`
  - **`recipes/{id}/comments/{id}`** — `text, authorUid, authorName, createdAt`
- **`pantryItems/{id}`** — `name, location, quantity, useByDate, plannedForRecipeId, plannedForNote, notes`
- **`pantryLog/{id}`** — append-only `itemName, action ("added"|"usedUp"|"adjusted"), quantity, previousQuantity?, at, by` —
  not shown in the UI yet, banked for future budget/trend reporting
- **`mealPlan/{id}`** — `date, recipeId, mealType, status, notes`

## Roadmap

- **Now**: pantry, recipes (+ comments/votes), meal plan, spreadsheet data migration
- **Phase 2**: shopping list generator (aggregate `mealPlan` → `recipes.ingredients`, cross-reference
  `pantryItems` by name), Google Calendar sync (shared "Household Meals" calendar, `calendarEventId`
  field on `mealPlan`)
- **Phase 3**: receipt-photo scanning (Cloud Function + OCR + review screen), budget rollups,
  use-by alerts, `pantryLog` reporting
