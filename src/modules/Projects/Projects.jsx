import ProjectTable from './ProjectTable';
import AddProjectForm from './AddProjectForm';

export { ProjectTable, AddProjectForm };
export default function Projects({
  isAddingProject,
  projects,
  handleAddProject,
  setIsAddingProject,
  setIsAddSubProjectOpen,
  triggerNotification,
  activeTab,
  setActiveTab
}) {
  if (isAddingProject) {
    return (
      <AddProjectForm 
        onAdd={handleAddProject}
        onClose={() => setIsAddingProject(false)}
      />
    );
  }
  return (
    <ProjectTable 
      projects={projects} 
      onAddProjectClick={() => setIsAddingProject(true)}
      onAddSubProjectClick={() => setIsAddSubProjectOpen(true)}
      onExportTrigger={(type) => triggerNotification(`${type} triggered successfully.`)}
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
    />
  );
}
