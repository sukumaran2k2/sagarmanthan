import React, { useState, useEffect } from 'react';
import ProjectDashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import InternalNavigation from '../../components/navigation/InternalNavigation';
import { PROJECTS_NAVIGATION_TABS } from './constants';
import { useProjects } from './hooks/useProjects';
import { AddProjectDialog, AddSubProjectModal } from './components/ProjectDialogs';

export default function ProjectsModule({ initialTab, onSyncTab, triggerNotification }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'dashboard');
  const { projects, addProject } = useProjects();
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isAddSubProjectOpen, setIsAddSubProjectOpen] = useState(false);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (onSyncTab) onSyncTab(tab);
  };

  const handleAddProjectClick = () => {
    setIsAddingProject(true);
  };

  const handleAddSubProjectClick = () => {
    setIsAddSubProjectOpen(true);
  };

  const handleAddProjectSubmit = async (newProject) => {
    try {
      await addProject(newProject);
      if (triggerNotification) {
        triggerNotification(`Project ${newProject.projectId} successfully created.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSubProjectSubmit = (newSubProject) => {
    // Need to hook this up to the service later
    // For now simulate adding to state
    if (triggerNotification) {
      triggerNotification(`Sub-project ${newSubProject.subProjectId} successfully created.`);
    }
  };

  const headerNav = (
    <InternalNavigation
      tabs={PROJECTS_NAVIGATION_TABS}
      currentTab={activeTab}
      onTabChange={handleTabChange}
    />
  );

  return (
    <>
      {activeTab === 'dashboard' && <ProjectDashboard projects={projects} headerNav={headerNav} />}
      {activeTab === 'projects' && (
        <ProjectList 
          projects={projects} 
          headerNav={headerNav} 
          onAddProjectClick={handleAddProjectClick} 
          onAddSubProjectClick={handleAddSubProjectClick} 
          onExportTrigger={(type) => triggerNotification && triggerNotification(`${type} triggered successfully.`)} 
        />
      )}
      
      {/* Dialogs */}
      {isAddingProject && (
        <AddProjectDialog 
          onAdd={handleAddProjectSubmit}
          onClose={() => setIsAddingProject(false)}
        />
      )}

      {isAddSubProjectOpen && (
        <AddSubProjectModal
          isOpen={isAddSubProjectOpen}
          onClose={() => setIsAddSubProjectOpen(false)}
          onAdd={handleAddSubProjectSubmit}
          projects={projects}
        />
      )}

    </>
  );
}
