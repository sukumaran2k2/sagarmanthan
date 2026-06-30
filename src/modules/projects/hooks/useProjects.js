import { useState, useEffect, useCallback } from 'react';
import * as projectService from '../services/projectService';

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await projectService.fetchProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const addProject = async (project) => {
    try {
      const newProject = await projectService.addProject(project);
      setProjects(prev => [...prev, newProject]);
      return newProject;
    } catch (err) {
      throw err;
    }
  };

  return {
    projects,
    isLoading,
    error,
    addProject,
    refreshProjects: loadProjects
  };
}
