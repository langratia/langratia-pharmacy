# Frontend Architecture Analysis

This document provides a comprehensive architectural analysis of the Langratia Pharmacy POS frontend.

## 1. Overview and Technology Stack
The frontend is a single-page application (SPA) built with **React** (v19) and **TypeScript**, bundled using **Vite**. It is designed to run within a desktop environment using **Wails**, which bridges the React frontend with a local Go backend.

- **UI Framework:** React
- **Styling:** Vanilla CSS (`index.css`) combined heavily with inline styles using CSS variables for theming.
- **Icons:** `lucide-react`
- **Animations:** `framer-motion`
- **Charting:** `recharts`

## 2. Routing Architecture
The application eschews traditional routing libraries like `react-router` in favor of a **Custom State-Based Router**.
- **Mechanism:** The current route is maintained in the `App.tsx` component via an `activeView` state variable (typed as `NavItemKey`).
- **Implementation:** A `switch` statement in `App.tsx` renders the corresponding feature component (e.g., `<DashboardPage />`, `<POSPage />`).
- **Code Splitting:** Feature modules are lazy-loaded using `React.lazy()` and wrapped in a `<Suspense>` boundary to optimize initial load times.
- **Data Passing:** Navigation is triggered by passing an `onSelectView` callback down the component tree.

## 3. Global State and Context Providers
Global state is managed exclusively using the React Context API. The provider tree is structured as follows:

1. **`ThemeProvider`**: Manages UI modes (light/dark) using CSS classes applied to the root document.
2. **`PharmacyContext`**: Fetches and caches global pharmacy configuration (e.g., currency, tax rate, low stock thresholds) from the backend.
3. **`AuthContext`**: Manages the user session. It validates sessions against the backend on startup, handles login/logout, and stores a minimal session ID in `localStorage`.
4. **`PermissionContext`**: Provides Role-Based Access Control (RBAC). It fetches a set of permissions based on the logged-in user's role and exposes `can()` and `hasPermission()` utilities.

## 4. Component Architecture
The application is structured into distinct layers:

### A. Layout Components (`src/components/layout/`)
- Forms the application shell (`MainLayout.tsx`, `Header.tsx`, `Sidebar.tsx`, `TitleBar.tsx`).
- Responsive design tailored for desktop environments.

### B. UI Primitives (`src/components/ui/`)
- Custom, reusable, zero-dependency UI components such as `DataGrid`, `Modal`, `Panel`, `SearchBar`, and `CommandPalette`.
- Ensures design consistency without relying on heavy third-party UI libraries like MUI or Ant Design.

### C. Feature Modules (`src/features/`)
- Encapsulates domain-specific logic and views (`auth`, `pos`, `inventory`, `prescriptions`, etc.).
- Feature components manage their own local state, data fetching (communicating directly with the Wails backend via `wailsjs`), and complex interactions.

## 5. Potential Problems and Modification Risks
- **Coupling of Inline Styles:** The extensive use of inline styles within component files (e.g., `InventoryPage.tsx`) makes it difficult to maintain responsive design or apply bulk styling changes without touching JSX.
- **State Prop Drilling:** Navigation and specific data (like cart items passed between Prescriptions and POS views) are passed deeply via props, increasing coupling between feature modules.
- **Wails Dependency:** The frontend is tightly coupled to the Wails runtime (`(window as any)?.go?.main?.App`). Migrating this application to a web browser would require a significant rewrite of the data fetching layer.
