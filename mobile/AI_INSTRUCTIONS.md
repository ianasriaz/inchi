# Project Inchi - AI Development Context

## 1. Project Overview
**Inchi** is a lightning-fast React Native (Expo) mobile application designed specifically for tailors in Pakistan. It is an MVP order management system engineered for high-speed data entry in a busy shop environment.

## 2. Tech Stack
* **Frontend:** React Native, Expo, TypeScript, React Navigation (Native Stack).
* **Backend & Auth:** Supabase (PostgreSQL, Data API).
* **Styling:** StyleSheet (React Native), Centralized Color Palette (`src/theme/colors.ts`), Custom Font (`NotoNastaliqUrdu` from Google Fonts).

## 3. Core Architectural Rules (CRITICAL FOR AI AGENTS)
When writing code for Inchi, you MUST adhere to these absolute rules:
1.  **The "No Keyboard" Rule:** The core measurement screen must NEVER trigger the native iOS/Android system keyboard. Measurements are entered strictly via our custom `<TailorNumPad>` component. Native inputs are only allowed for initial customer searches or the final finance/invoice screen.
2.  **JSONB Supabase Superpower:** Do not map specific measurements (length, chest, etc.) to SQL columns. They must always be saved as a single JSON object inside the `measurements` JSONB column in the `orders` table to allow infinite future flexibility.
3.  **Urdu Localization:** The app uses bilingual labels (English / Urdu). E.g., `Length / لمبائی`. Always apply the `NotoNastaliqUrdu` font family to Urdu text elements.
4.  **The Math Rule:** Do not calculate `balance_amount` manually in the app before saving to the database. The Supabase `orders` table handles this via a Generated Column (`total_amount - advance_amount`).

## 4. UI / UX Design System
We use a high-contrast, modern Light Theme tailored for bright shop environments.
* **Colors:** All colors are centralized in `src/theme/colors.ts`. **DO NOT use hardcoded hex values in stylesheets.** Always import `colors` from the theme folder.
* **Backgrounds:** `colors.background` (Pure White) or `colors.surface` (light grey) for input containers.
* **Text & Borders:** `colors.text` and `colors.border`.
* **Primary Accents & Active States:** `colors.primary` (Mint Green).
* **Layout:** Use 2-column grids for measurement forms to eliminate vertical scrolling. Buttons should be large, block-style, and highly touchable.

## 5. Current App Flow (React Navigation)
1.  **DashboardScreen:** The home screen. Displays active orders fetched from Supabase. Features a 1-tap WhatsApp deep-link button (`Linking.openURL`) to message customers when clothes are ready. Bottom CTA: "New Booking".
2.  **CustomerSearchScreen:** A split-tab interface.
    * *Regular Tab:* Search existing via `customer_number`.
    * *New Tab:* Auto-fetches the next available ID from Supabase and creates a new row with Name and Phone.
3.  **MeasurementScreen:** The ledger-style grid. Contains 8 standard Kameez Shalwar fields and style chips (Collar, Pockets). Powered entirely by the docked `<TailorNumPad>`.
4.  **InvoiceScreen:** The final checkout step. Uses native numeric keyboards to capture `Total` and `Advance`. Pushes the complete payload to the Supabase `orders` table.

## 6. Database Schema (Supabase)
**Table 1: `customers`**
* `id` (int8, primary key)
* `customer_number` (int8, unique, user-facing ID)
* `name` (text)
* `phone` (text)

**Table 2: `orders`**
* `id` (uuid, primary key)
* `customer_id` (int8, foreign key -> customers.id)
* `garment_type` (text, e.g., 'Kameez Shalwar')
* `measurements` (jsonb)
* `style_options` (jsonb)
* `total_amount` (int8)
* `advance_amount` (int8)
* `balance_amount` (int8, GENERATED ALWAYS AS (total_amount - advance_amount) STORED)
* `status` (text, default 'pending')
