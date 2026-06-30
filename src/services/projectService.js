import { projects } from '../mock/projects';

export const fetchProjects = async () => {
  // Simulate network delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(projects);
    }, 300);
  });
};

export const createProject = async (projectData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newProject = {
        id: Date.now(),
        ...projectData
      };
      projects.push(newProject);
      resolve(newProject);
    }, 300);
  });
};
