<div align="center">
  <br />
  <h1>🪡 Inchi</h1>
  <p>
    <strong>A modern Tailor Shop Management Mobile Application</strong>
  </p>
  <p>
    Built with React Native, TypeScript, and Supabase.
  </p>
</div>

<br />

## 🌟 Overview

**Inchi** is a comprehensive mobile application designed specifically for tailor shops. It digitizes the entire workflow of a tailoring business, from customer onboarding and taking intricate garment measurements to tracking orders and managing revenue.

With a beautiful, intuitive UI, Inchi replaces the traditional "Khata" (register book) with a seamless digital experience.

## ✨ Key Features

- 📊 **Dashboard & Analytics:** Track revenue, daily orders, and business performance at a glance.
- 👥 **Customer Management (Gahak):** Maintain detailed profiles, contact info, and measurement history for every customer.
- 📏 **Measurement Tracking:** Highly customizable measurement logs for different garment types, including specific styles (collars, pockets, etc.).
- 📦 **Order Management (Khata):** Track the lifecycle of every order with statuses like `Stitching`, `Ready`, and `Delivered`.
- 🧾 **Digital Invoicing:** Generate clear, detailed invoices for customers directly from the app.
- 🔤 **Localization:** First-class support for custom Urdu typography (`NotoNastaliqUrdu`).

## 🛠 Tech Stack

- **Frontend:** React Native, Expo
- **Language:** TypeScript
- **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication:** Supabase Auth
- **State Management:** React Query (`@tanstack/react-query`)
- **Navigation:** React Navigation (Stack & Bottom Tabs)

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16 or newer)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Supabase Account](https://supabase.com/) (for backend services)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/inchi.git
   cd inchi/mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root of the `mobile` directory and add your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

## 📱 Screenshots / Demo

*(Add screenshots or a GIF demo of your app running here!)*

---

<div align="center">
  <i>Built with ❤️ for tailors.</i>
</div>