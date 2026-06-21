# INCHI App - AI & Developer Architecture Guide

This guide is designed for AI coding assistants (e.g., Claude, Gemini, Cursor) to quickly understand the project architecture, tech stack, constraints, database schemas, and implementation patterns of the **Inchi** mobile application.

---

## 1. Project Overview
**Inchi** is a React Native (Expo) order and measurement management system built specifically for tailors in Pakistan. It is designed for high-speed data entry in a fast-paced shop environment.

---

## 2. Tech Stack
* **Framework:** React Native (Expo SDK) with TypeScript
* **Database & Auth:** Supabase (PostgreSQL with Realtime capabilities)
* **Navigation:** React Navigation (`@react-navigation/native-stack` & `@react-navigation/bottom-tabs`)
* **Styling:** React Native standard `StyleSheet`
* **Fonts:** `NotoNastaliqUrdu_400Regular` (and custom Urdu font configurations for Nastaliq styling)

---

## 3. Directory Structure
```
mobile/
├── App.tsx                     # App entry point, session handler, Root navigation stack
├── app.json                    # Expo config
├── AI_INSTRUCTIONS.md          # Brief AI context rules
├── README_AI.md                # [This File] Master architectural guide
├── src/
│   ├── components/
│   │   ├── EmptyState.tsx      # Standard empty list illustration
│   │   ├── OfflineBanner.tsx   # Network monitoring notification banner
│   │   ├── Skeleton.tsx        # Placeholder loading state animations
│   │   └── TailorNumPad.tsx    # Custom numerical keyboard used on Measurement screen
│   ├── lib/
│   │   └── supabase.ts         # Supabase JS client configuration
│   ├── screens/
│   │   ├── AuthScreen.tsx            # Login / Sign up flow
│   │   ├── DashboardScreen.tsx       # Home dashboard, main statistics, quick actions
│   │   ├── CustomerSearchScreen.tsx  # Customer lookups & quick new customer onboarding
│   │   ├── CustomersScreen.tsx       # Complete customer list & search directory
│   │   ├── CustomerProfileScreen.tsx # Customer details, history, and default measurements
│   │   ├── MeasurementScreen.tsx     # Wizard-based order creation (Garment, Measurements, Styles)
│   │   ├── OrdersScreen.tsx          # Order management, status filters, payment logs
│   │   ├── InvoiceScreen.tsx         # Payment step (Total, Advance, Balance calculation)
│   │   ├── RevenueScreen.tsx         # Analytical charts & charts of cash flow
│   │   └── SettingsScreen.tsx        # App & profile settings
│   └── utils/
│       └── textUtils.ts        # Helper functions (e.g., containsUrdu detection)
```

---

## 4. CRITICAL Architectural Constraints (Read before editing!)

### Rule 1: The "No Native Keyboard" Rule for Measurements
* On the [MeasurementScreen.tsx](file:///c:/Users/youra/.gemini/antigravity-ide/scratch/inchi/mobile/src/screens/MeasurementScreen.tsx), you must **NEVER** trigger the native iOS/Android software keyboard for entering measurements.
* All input fields in the measurements grid are wrapped in `TouchableOpacity` buttons that trigger the custom, docked `<TailorNumPad>` component.
* Native system keyboards are allowed **only** for:
  - Text search boxes (e.g., customer names).
  - General text inputs (e.g., name, phone number inside forms).
  - Numerical inputs in the [InvoiceScreen.tsx](file:///c:/Users/youra/.gemini/antigravity-ide/scratch/inchi/mobile/src/screens/InvoiceScreen.tsx) step (Total Amount, Advance Amount).

### Rule 2: JSONB Storage Pattern (No Columns for Individual Measurements)
* Never map individual measurements (e.g. waist, chest, length, sleeve) to distinct SQL columns in the database.
* All measurements must be stored as a key-value JSON object in the `measurements` `JSONB` column inside the `orders` and `customers` (via `default_measurements`) tables.
* This allows adding/removing measurement parameters dynamically without database migrations.

### Rule 3: Urdu Localization & Font Rendering
* Labels in forms display both English and Urdu: `Label / اردو`.
* Always use the `containsUrdu` helper from [textUtils.ts](file:///c:/Users/youra/.gemini/antigravity-ide/scratch/inchi/mobile/src/utils/textUtils.ts) to detect if a text contains Urdu characters.
* If Urdu is detected, apply the `fontFamily: 'NotoNastaliqUrdu'` style.
* **Important:** Urdu fonts (specifically Nastaliq) have very tall ascenders and deep descenders. Keep Urdu text lines padded vertically (`paddingTop`, `paddingBottom`) and ensure `lineHeight` is generous (typically at least `1.5x` of `fontSize`) to prevent cropping on Android and iOS devices.

### Rule 4: Server-Side Math (No Local Calculations for Balance)
* Never calculate the remaining `balance_amount` in the code prior to uploading an order to Supabase.
* The `balance_amount` column in the `orders` table is a PostgreSQL **Generated Column** (`total_amount - advance_amount STORED`). Let the database handle this arithmetic automatically.

---

## 5. UI Design Tokens & Theme Guidelines
The app utilizes a premium, high-contrast **Light Theme** optimised for bright tailor shops.
* **Background Colors:** Pure White (`#FFFFFF`) or off-white light grey (`#F7F8FA`) for input elements.
* **Text & Contrast Elements:** Dark Slate (`#161D26`).
* **Active/Accent Color:** Vibrant Mint Green (`#00e482`).
* **Profile / Customer Cards:** Styled as premium light cards (`#F7F8FA`) with clean borders (`#E8ECEF`) and distinct, high-contrast text. **Never use dark backgrounds for these panels.**

---

## 6. Database Schema (Supabase)

### `customers` Table
| Column Name | Data Type | Notes |
| :--- | :--- | :--- |
| `id` | int8 (PK) | Auto-incrementing |
| `customer_number` | int8 (Unique) | User-facing sequential ID (e.g., `#1024`) |
| `name` | text | Customer's full name (can contain English or Urdu) |
| `phone` | text | Primary mobile number |
| `default_measurements` | jsonb | Store default key-value pairs of last used measurements |
| `default_garment_type` | text | E.g. 'Kameez Shalwar', 'Kurta' |
| `created_at` | timestamptz | Timestamp of registration |

### `orders` Table
| Column Name | Data Type | Notes |
| :--- | :--- | :--- |
| `id` | uuid (PK) | Unique identifier |
| `customer_id` | int8 (FK) | References `customers.id` |
| `garment_type` | text | E.g., 'Kameez Shalwar' or 'Kurta' |
| `measurements` | jsonb | Key-value mapping of size parameters (inches/values) |
| `style_options` | jsonb | Stylistic configurations (e.g., collar: 'Ban', pockets: ['side', 'front']) |
| `total_amount` | int8 | Total charge for the order |
| `advance_amount` | int8 | Deposit paid by the customer |
| `balance_amount` | int8 | Auto-calculated in database (`total_amount - advance_amount`) |
| `status` | text | Can be 'pending', 'ready', 'delivered' |
| `notes` | text | Optional stitching remarks |
| `created_at` | timestamptz | Date & time of the booking |

---

## 7. Navigation Flow (React Navigation)
1. **AuthScreen** -> Checks Supabase sessions and routes to main application.
2. **MainTabs** (Tab Navigator):
   - **Dashboard**: High-level statistics (pending orders, revenue summary) and quick action routes.
   - **Orders**: Filters orders by status ('all', 'pending', 'ready', 'delivered') and manages delivery status updates.
   - **Customers**: List of all customers, tap on a card to navigate to `CustomerProfile`.
3. **CustomerSearch**: Search bar for customer number lookup, or creating a new profile.
4. **CustomerProfile**: View stats, default measurements, and start a new booking.
5. **Measurement**: Wizard-based measurement flow.
6. **Invoice**: Invoice totals, advances, and saves to database.
