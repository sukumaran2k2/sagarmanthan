import { INITIAL_PROJECTS } from '../mock/projects';

export const fetchProjects = async () => {
  // Simulate API call
  return Promise.resolve(INITIAL_PROJECTS);
};

export const addProject = async (project) => {
  // Simulate API call
  return Promise.resolve(project);
};

export const addSubProject = async (subProject) => {
  // Simulate API call
  return Promise.resolve(subProject);
};
