# Folder Structure

```text
src/
├── assets/         # Static assets (images, icons)
├── components/     # Reusable components
│   ├── common/     # Generic UI (Button, Modal, Badge)
│   ├── dashboard/  # Reusable Dashboard structural elements
│   ├── tables/     # Standardized DataTable components
│   ├── charts/     # Abstracted chart wrappers
│   ├── navigation/ # Header, Sidebar, Footer
│   ├── forms/      # Input fields, Selects
│   ├── feedback/   # Spinners, Empty states
│   ├── layout/     # Structural layouts
│   ├── project/    # Feature-specific components for Projects
│   ├── hr/         # Feature-specific components for HR
│   └── ports/      # Feature-specific components for Ports
├── pages/          # Application views organized by feature
├── layouts/        # High-level layouts (MainLayout, AuthLayout)
├── contexts/       # React Context providers (Auth, Theme)
├── hooks/          # Custom hooks (useProjects, useAuth)
├── services/       # API integration layers
├── mock/           # Mock data arrays used by services
├── constants/      # Configuration objects (columns, filters)
├── utils/          # Helper functions (currency, dates)
└── styles/         # Global styles
```
