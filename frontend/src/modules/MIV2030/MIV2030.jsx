import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Layers, FilePieChart, 
  PlusCircle, BarChart3, Building2 
} from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import Dashboard from './pages/Dashboard';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Meetings from './pages/Meetings';
import MIVReports from './pages/OrgReport';
import ThemeReport from './pages/ThemeReport';
import { useMIVPermissions } from './hooks/useMIVPermissions';
// ============================================================
// IMPORTANT
// ============================================================
// Import your new report component here.
//
// This is the component containing:
// Report 1.1
// Report 1.2
// Report 1.3
// Report 1.4
// Report 1.5
//
// If your file name is MIVReports.jsx, keep this as it is.
// ============================================================

export default function MIV2030View({
  triggerNotification,
}) {

  const location = useLocation();

  const navigate = useNavigate();

  const permissions =
    useMIVPermissions();

  const {
    canAdd,
    canEdit,
    canView,
  } = permissions;


  // ============================================================
  // STATE
  // ============================================================

  const [inputFormType, setInputFormType] =
    useState("initiative");

  const [editData, setEditData] =
    useState(null);


  // ============================================================
  // CURRENT TAB / SUB ITEM
  // ============================================================

  const {
    currentTabId,
    currentActiveSubItem,
  } = useMemo(() => {

    const path =
      location.pathname.toLowerCase();


    // ----------------------------------------------------------
    // DASHBOARD
    // ----------------------------------------------------------

    if (
      path.includes("/dashboard")
    ) {

      return {
        currentTabId: "dashboard",
        currentActiveSubItem: null,
      };

    }


    // ----------------------------------------------------------
    // MEETINGS
    // ----------------------------------------------------------

    if (
      path.includes("/meetings")
    ) {

      return {
        currentTabId: "meetings",
        currentActiveSubItem: null,
      };

    }


    // ----------------------------------------------------------
    // INPUT FORM
    // ----------------------------------------------------------

    if (
      path.includes("/input-form") ||
      path.includes("/add") ||
      path.includes("/edit")
    ) {

      return {
        currentTabId: "add",
        currentActiveSubItem:
          inputFormType,
      };

    }


    // ----------------------------------------------------------
    // REPORTS
    // ----------------------------------------------------------
    // Both old URLs are treated as Reports,
    // but we no longer show Organisation / Theme tabs.
    // ----------------------------------------------------------

    if (
      path.includes("/reports") ||
      path.includes("/org-report") ||
      path.includes("/theme-report")
    ) {

      return {
        currentTabId: "reports",
        currentActiveSubItem: null,
      };

    }


    // ----------------------------------------------------------
    // DEFAULT = DATA LIST
    // ----------------------------------------------------------

    return {
      currentTabId: "list",
      currentActiveSubItem: null,
    };

  }, [
    location.pathname,
    inputFormType,
  ]);


  // ============================================================
  // INTERNAL NAVIGATION TABS
  // ============================================================

  const tabs = useMemo(() => {

    const list = [];


    // ----------------------------------------------------------
    // DASHBOARD
    // ----------------------------------------------------------

    if (canView) {

      list.push({
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
      });

    }


    // ----------------------------------------------------------
    // INPUT FORM
    // ----------------------------------------------------------

    if (canAdd) {

      list.push({
        id: "add",
        label: "Input Form",
        icon: PlusCircle,

        subMenu: [

          {
            id: "initiative",
            label: "Add Initiative",
          },

          {
            id: "meeting",
            label: "Add MVIC Meeting",
          },

        ],
      });

    }


    // ----------------------------------------------------------
    // MIV MEETINGS
    // ----------------------------------------------------------

    if (canView) {

      list.push({
        id: "meetings",
        label: "MIV Meetings",
        icon: Users,
      });

    }


    // ----------------------------------------------------------
    // MIV INITIATIVES
    // ----------------------------------------------------------

    if (canView) {

      list.push({
        id: "list",
        label: "MIV Initiatives",
        icon: Layers,
      });

    }


    // ----------------------------------------------------------
    // REPORTS
    // ----------------------------------------------------------
    //
    // IMPORTANT:
    // No Organisation Report / Theme Report submenu here.
    //
    // Reports is now a single menu item.
    //
    // Report 1.1 - 1.5 are handled inside MIVReports.
    // ----------------------------------------------------------

    if (canView) {

      list.push({
        id: "reports",
        label: "Reports",
        icon: FilePieChart,
      });

    }


    return list;

  }, [
    canAdd,
    canView,
  ]);


  // ============================================================
  // MAIN TAB CHANGE
  // ============================================================

  const handleTabChange = (
    tabId
  ) => {

    // ----------------------------------------------------------
    // Clear edit data when leaving input form
    // ----------------------------------------------------------

    if (tabId !== "add") {

      setEditData(null);

    }


    // ----------------------------------------------------------
    // DASHBOARD
    // ----------------------------------------------------------

    if (
      tabId === "dashboard"
    ) {

      navigate(
        "/strategies/miv-2030/dashboard"
      );

    }


    // ----------------------------------------------------------
    // DATA LIST
    // ----------------------------------------------------------

    else if (
      tabId === "list"
    ) {

      navigate(
        "/strategies/miv-2030/data-list"
      );

    }


    // ----------------------------------------------------------
    // MEETINGS
    // ----------------------------------------------------------

    else if (
      tabId === "meetings"
    ) {

      navigate(
        "/strategies/miv-2030/meetings"
      );

    }


    // ----------------------------------------------------------
    // INPUT FORM
    // ----------------------------------------------------------

    else if (
      tabId === "add"
    ) {

      navigate(
        "/strategies/miv-2030/input-form"
      );

    }


    // ----------------------------------------------------------
    // REPORTS
    // ----------------------------------------------------------
    //
    // IMPORTANT:
    // One single Reports route.
    //
    // Do NOT navigate to:
    // /org-report
    // /theme-report
    //
    // MIVReports handles Report 1.1 - 1.5.
    // ----------------------------------------------------------

    else if (
      tabId === "reports"
    ) {

      navigate(
        "/strategies/miv-2030/reports"
      );

    }

  };


  // ============================================================
  // SUB MENU CHANGE
  // ============================================================

  const handleSubItemChange = (
    subId
  ) => {

    // ----------------------------------------------------------
    // INPUT FORM SUB ITEMS
    // ----------------------------------------------------------

    if (
      subId === "initiative" ||
      subId === "meeting"
    ) {

      setInputFormType(
        subId
      );

      navigate(
        "/strategies/miv-2030/input-form"
      );

      return;

    }


    // ----------------------------------------------------------
    // OLD REPORT SUB ITEMS
    // ----------------------------------------------------------
    //
    // These are intentionally no longer used.
    //
    // If InternalNavigation somehow sends one of these,
    // simply open the main Reports page.
    // ----------------------------------------------------------

    if (
      subId === "org-report" ||
      subId === "theme-report"
    ) {

      navigate(
        "/strategies/miv-2030/reports"
      );

    }

  };


  // ============================================================
  // EDIT INITIATIVE
  // ============================================================

  const handleEditInitiative = (
    item
  ) => {

    setEditData(item);

    setInputFormType(
      "initiative"
    );

    navigate(
      "/strategies/miv-2030/input-form",
      {
        state: {
          item,
        },
      }
    );

  };


  // ============================================================
  // ADD NEW
  // ============================================================

  const handleAddNew = () => {

    setEditData(null);

    setInputFormType(
      "initiative"
    );

    navigate(
      "/strategies/miv-2030/input-form"
    );

  };


  // ============================================================
  // FORM SUCCESS
  // ============================================================

  const handleFormSuccess = () => {

    setEditData(null);

    navigate(
      "/strategies/miv-2030/data-list"
    );

  };


  // ============================================================
  // FORM CANCEL
  // ============================================================

  const handleFormCancel = () => {

    setEditData(null);

    navigate(
      "/strategies/miv-2030/data-list"
    );

  };


  // ============================================================
  // RESTRICTED ACCESS
  // ============================================================

  if (
    !canAdd &&
    !canView &&
    !canEdit
  ) {

    return (
      <RestrictedAccess
        moduleName="Maritime India Vision 2030 (MIV 2030)"
      />
    );

  }


  // ============================================================
  // UI
  // ============================================================

  return (

    <div
      className="
        space-y-6
        px-1
        md:px-2
        py-4
        animate-fade-in
        text-slate-800
        dark:text-slate-100
      "
    >


      {/* ========================================================
          HEADER ROW
      ======================================================== */}

      <div
        className="
          flex
          flex-col
          lg:flex-row
          lg:items-center
          justify-between
          gap-4
          border-b
          border-slate-200
          dark:border-slate-800
          pb-4
          mb-6
          select-none
        "
      >


        {/* ======================================================
            TITLE
        ====================================================== */}

        <div>

          <h1
            className="
              text-xl
              font-black
              text-[#0f417a]
              dark:text-blue-400
              tracking-wide
              uppercase
              font-display
            "
          >

            Maritime India Vision 2030
            {" "}
            (MIV 2030)

          </h1>


          <p
            className="
              text-xs
              text-slate-500
              dark:text-slate-400
              mt-1
              font-medium
              font-sans
            "
          >

            Strategic framework to unlock
            maritime economic potential
            with world-class port
            infrastructure and initiatives.

          </p>

        </div>


        {/* ======================================================
            INTERNAL NAVIGATION
        ====================================================== */}

        <InternalNavigation

          tabs={tabs}

          currentTab={currentTabId}

          currentSubItem={
            currentActiveSubItem
          }

          onTabChange={
            handleTabChange
          }

          onSubItemChange={
            handleSubItemChange
          }

        />

      </div>


      {/* ========================================================
          MAIN VIEW ROUTER
      ======================================================== */}

      <div>

        <Routes>


          {/* ====================================================
              DASHBOARD
          ==================================================== */}

          <Route
            path="dashboard"
            element={

              <Dashboard
                onNavigateToTab={
                  handleTabChange
                }
              />

            }
          />


          {/* ====================================================
              MEETINGS
          ==================================================== */}

          <Route
            path="meetings"
            element={

              <Meetings
                triggerNotification={
                  triggerNotification
                }
              />

            }
          />


          {/* ====================================================
              DATA LIST
          ==================================================== */}

          <Route
            path="data-list"
            element={

              <DataList

                onEdit={
                  handleEditInitiative
                }

                onAddNew={
                  canAdd
                    ? handleAddNew
                    : null
                }

                triggerNotification={
                  triggerNotification
                }

              />

            }
          />


          {/* ====================================================
              INPUT FORM
          ==================================================== */}

          <Route
            path="input-form"
            element={

              <InputForm

                editData={
                  editData
                }

                initialFormType={
                  inputFormType
                }

                onSuccess={
                  handleFormSuccess
                }

                onCancel={
                  handleFormCancel
                }

                triggerNotification={
                  triggerNotification
                }

              />

            }
          />


          {/* ====================================================
              REPORTS
          ====================================================

              IMPORTANT:

              There is now ONLY ONE Reports route.

              Inside MIVReports:

              Report 1.1
              Report 1.2
              Report 1.3
              Report 1.4
              Report 1.5

              will be displayed as tabs.

              There are NO:

              Organisation Report (Form 1A)
              Theme Report (Form 2A)

              tabs here anymore.
          ==================================================== */}

          <Route
            path="reports"
            element={

              <div
                className="
                  space-y-4
                  animate-fade-in
                "
              >

                <MIVReports
                  triggerNotification={
                    triggerNotification
                  }
                />

              </div>

            }
          />


          {/* ====================================================
              OPTIONAL:
              OLD ORG REPORT URL
          ====================================================

              This redirects old bookmarks/URLs to the
              new Reports page.
          ==================================================== */}

          <Route
            path="org-report"
            element={

              <Navigate
                to="../reports"
                replace
              />

            }
          />


          {/* ====================================================
              OPTIONAL:
              OLD THEME REPORT URL
          ====================================================

              This redirects old bookmarks/URLs to the
              new Reports page.
          ==================================================== */}

          <Route
            path="theme-report"
            element={

              <Navigate
                to="../reports"
                replace
              />

            }
          />


          {/* ====================================================
              DEFAULT
          ==================================================== */}

          <Route
            index
            element={

              <Navigate
                to="data-list"
                replace
              />

            }
          />


          {/* ====================================================
              UNKNOWN ROUTE
          ==================================================== */}

          <Route
            path="*"
            element={

              <Navigate
                to="data-list"
                replace
              />

            }
          />

        </Routes>

      </div>

    </div>

  );

}