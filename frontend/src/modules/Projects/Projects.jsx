import { useState } from 'react';
import ProjectTable from './ProjectTable';
import AddProjectForm from './AddProjectForm';
import AddSubProjectModal from './AddSubProjectModal';

export { ProjectTable, AddProjectForm };

export default function Projects({
  projects,
  onAddProject,
  onAddSubProject,
  triggerNotification,
  activeTab,
  setActiveTab
}) {
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isAddSubProjectOpen, setIsAddSubProjectOpen] = useState(false);

  if (isAddingProject) {
    return (
      <AddProjectForm 
        onAdd={(newProj) => {
          onAddProject(newProj);
          setIsAddingProject(false);
        }}
        onClose={() => setIsAddingProject(false)}
      />
    );
  }

  return (
    <>
      <ProjectTable 
        projects={projects} 
        onAddProjectClick={() => setIsAddingProject(true)}
        onAddSubProjectClick={() => setIsAddSubProjectOpen(true)}
        onExportTrigger={(type) => triggerNotification(`${type} triggered successfully.`)}
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
      />

      {isAddSubProjectOpen && (
        <AddSubProjectModal
          isOpen={isAddSubProjectOpen}
          onClose={() => setIsAddSubProjectOpen(false)}
          onAdd={(newSubProj) => {
            onAddSubProject(newSubProj);
            setIsAddSubProjectOpen(false);
          }}
          projects={projects}
        />
      )}
    </>
  );
}
