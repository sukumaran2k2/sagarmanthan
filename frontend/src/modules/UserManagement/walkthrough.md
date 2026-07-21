# Walkthrough - Module Permissions Tab in User Matrix

A new tab called "Module Permissions" has been implemented inside the User Matrix permission manager component.

## Changes Made

### `src/modules/UserManagement/UserMatrix.jsx`
- Added an active tab state (`activeMainTab`) to switch between **User Permissions** and **Module Permissions** at the top of the interface.
- Structured the **Module Permissions** tab to match the requested layout:
  - **Left Sidebar:** A list of the 17 organizations (Ministry of Ports, Shipping and Waterways, Major Ports, CSL, etc.) as main headings.
  - **Right Area:** A list of all 63 modules with visual, interactive toggle switches (Turn On/Off).
- Added state (`orgModuleState`) to manage the toggle values individually per organization.
- Implemented **Enable All**, **Disable All**, and **Save Changes** actions for the selected organization's modules.
- Scoped new styles for the toggle switches inside the existing scoped `<style>` element.

## Verification

### Automated Verification
- Ran `npm run build` which successfully completed without compilation errors:
```
vite v8.0.16 building client environment for production...
transforming...✓ 2625 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                 0.48 kB │ gzip:     0.32 kB
dist/assets/sagarmanthan_logo-CpD1H-ZS.png      1.79 kB
dist/assets/index-CZR_5VyH.css                410.61 kB │ gzip:    64.24 kB
dist/assets/index-BRTI_8jC.js               4,513.18 kB │ gzip: 1,170.99 kB

✓ built in 7.24s
```

### Manual Verification Flow
1. Open the application and go to the **Admin** -> **User Matrix** page.
2. Click the **Module Permissions** tab at the top.
3. Observe the sidebar listing the 17 organizations.
4. Select any organization (e.g., CSL) from the left sidebar.
5. In the right pane, review the list of 63 modules.
6. Toggle a module (e.g., "Dashboard" or "KPI - IWAI") on or off using the toggle switch.
7. Click "Save Changes" to save the state, and verify the toast confirmation.
8. Switch to another organization and verify it has its own independent toggle states.
9. Switch back to the **User Permissions** tab to confirm it still displays the normal grid correctly.
