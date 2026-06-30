import React, { createContext, useState, useEffect } from 'react';
import { fetchProjects, createProject } from '../services/projectService';

export const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  };

  const addProject = async (projectData) => {
    try {
      const newProject = await createProject(projectData);
      setProjects(prev => [...prev, newProject]);
      return newProject;
    } catch (err) {
      throw new Error(err.message || 'Failed to add project');
    }
  };

  return (
    <ProjectContext.Provider value={{ projects, isLoading, error, loadProjects, addProject }}>
      {children}
    </ProjectContext.Provider>
  );
};
