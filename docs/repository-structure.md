# Sagarmanthan Enterprise Architecture

This document outlines the high-level repository structure and architectural patterns used in the Sagarmanthan React application. 

The application follows a **feature-based architecture**, designed for scalability, maintainability, and clean separation of concerns.

## Directory Structure

```text
src/
├── assets/                  # Static assets like images, SVGs, and global stylesheets
├── components/              # Shared, reusable UI components
│   ├── common/              # Generic components (Buttons, Inputs, Cards, Modals)
│   ├── dashboard/           # Reusable dashboard wrappers and layouts
│   ├── navigation/          # Global navigation components (Header, Tabs, InternalNavigation)
│   ├── forms/               # Shared form elements
│   ├── tables/              # Shared table/grid components
│   └── charts/              # Shared data visualization wrappers
├── constants/               # Global configuration and static string definitions
├── contexts/                # React Context providers for global state
├── hooks/                   # Custom reusable React hooks (e.g., useTheme, useAuth)
├── layouts/                 # Page layout wrappers (e.g., MainLayout, AuthLayout)
├── mock/                    # Mock data for local development and testing
├── modules/                 # Feature-based business modules (Core Architecture)
│   ├── attendance/          # Attendance tracking module
│   ├── cpgrams/             # Public grievance tracking module
│   ├── eoffice/             # Electronic office tracking module
│   ├── hr/                  # Human Resources management module
│   ├── ports/               # Major Ports operations and reporting module
│   └── projects/            # Project management module
├── services/                # API communication layers and external integrations
├── styles/                  # Global CSS variables and Tailwind configuration extensions
└── utils/                   # Helper functions, formatters, and utility scripts
```

## Feature-Based Module Pattern

Instead of grouping files by technical type (e.g., all pages in `src/pages`, all components in `src/components`), the application groups files by **business feature** inside `src/modules/`.

Each module is fully encapsulated and manages its own internal state, sub-pages, and local components.

### Module Structure Example (`src/modules/projects/`)

```text
src/modules/projects/
├── ProjectsModule.jsx       # Module Container (Entry Point) - Owns sub-page state
├── index.js                 # Public API exports for the module
├── components/              # Module-specific components (not shared globally)
└── pages/                   # Module-specific page views
    ├── Dashboard.jsx        # Project Dashboard view
    └── ProjectList.jsx      # Project List view
```

### Module Container Responsibility

The **Module Container** (e.g., `ProjectsModule.jsx`, `HRModule.jsx`) is the entry point for the module.
- It is rendered by the global router (`App.jsx`).
- It holds the local state for sub-navigation (e.g., which sub-tab is active).
- It renders the `InternalNavigation` component and dynamically mounts the appropriate page component based on the active tab.
- It cleanly synchronizes state with the global router when necessary via the `onSyncTab` callback to ensure breadcrumbs and URLs remain accurate.

### Cross-Module Navigation

The global `App.jsx` component routes to the appropriate Module Container based on the top-level application state. Once inside a module, the Module Container takes over routing via `InternalNavigation`.

## Shared Components vs. Module Components

- **`src/components/`**: Only components that are used across *multiple* business modules (e.g., generic buttons, global layout headers) should live here.
- **`src/modules/[module]/components/`**: Components that are strictly specific to a single business feature (e.g., a specific chart configuration only used in HR) should live inside that module's `components/` folder to prevent cluttering the global namespace.

## State Management

1. **Global State**: Managed at the `App.jsx` or Context level. Includes user authentication, global active feature tab, and theme settings.
2. **Module State**: Managed at the Module Container level. Includes active sub-tabs and module-wide filters.
3. **Local State**: Managed at the individual Page or Component level. Includes form inputs, temporary UI toggles (dropdowns), and local pagination.

## Styling Guidelines

The project uses **Vanilla CSS & Tailwind CSS**.
- **No Inline Styles**: Avoid `style={{}}` unless dynamically calculating values (e.g., progress bar width).
- **Design System Preservation**: When refactoring or adding new components, strictly adhere to the existing color palettes, gradients, and micro-animations defined in the global styles.

## Adding a New Module

1. Create a new folder under `src/modules/` (e.g., `src/modules/finance/`).
2. Create the Module Container (`FinanceModule.jsx`) to manage internal routing.
3. Create the `pages/` directory and add the views.
4. Export the module container from `index.js`.
5. Import the module container into `App.jsx` and add it to the routing logic.
