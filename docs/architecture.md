# Enterprise React Architecture

This project follows a highly scalable, feature-based enterprise React architecture.

## Core Principles

1. **Feature-Based Organization:** Files are grouped by feature (e.g., `project`, `hr`, `ports`) rather than by technical type (e.g., all components in one folder, all constants in another). This applies to `src/pages/`, `src/components/`, and `src/constants/`.
2. **Separation of Concerns:**
   - **Pages** (`src/pages/`) are largely presentational and wire up components.
   - **Business Logic** is contained within custom hooks (`src/hooks/`).
   - **Data Fetching** is abstracted into services (`src/services/`).
   - **Global State** is managed via Contexts (`src/contexts/`).
3. **Configuration-Driven UI:** Hardcoded arrays (filters, cards, table columns, navigation items) are stored in `src/constants/` and mapped over in components.
4. **Reusable Components:** Shared UI elements are kept in `src/components/` separated by their domain (e.g., `dashboard`, `tables`, `navigation`). Features that have specific reusable components keep them in `src/components/[feature]/`.
5. **Mock Data Separation:** Mock API responses are kept in `src/mock/` and are consumed by `src/services/`.

## Dashboard Structure
Every dashboard strictly follows this layout composition:
```
DashboardLayout
 └── DashboardHeader
 └── DashboardFilterPanel
 └── DashboardGrid
      ├── DashboardCard
      └── DashboardSection
           └── (Charts/Tables)
```
