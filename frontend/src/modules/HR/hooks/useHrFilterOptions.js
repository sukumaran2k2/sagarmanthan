import { useEffect, useState } from 'react';
import { fetchHrDepartments, fetchHrPostsByDepartment } from '../api';
import { CLASS_ID } from '../utils/hrAdministration';

// Department master per organisation (0 = every organisation), fetched once per session
const departmentCache = new Map();
const asList = (res) => (Array.isArray(res?.data) ? res.data : res?.data?.data || []);

function loadDepartments(orgId) {
  const key = String(Number(orgId) || 0);
  if (!departmentCache.has(key)) {
    departmentCache.set(key, fetchHrDepartments(key).then((res) => {
      const seen = new Map();
      asList(res).forEach((d) => {
        const id = String(d.department_id ?? '').trim();
        const name = String(d.department_name ?? '').trim();
        if (id && name && !seen.has(id)) seen.set(id, { department_id: id, department_name: name });
      });
      return [...seen.values()].sort((a, b) => a.department_name.localeCompare(b.department_name));
    }).catch((err) => {
      departmentCache.delete(key); // a failed load is retried next time
      throw err;
    }));
  }
  return departmentCache.get(key);
}

/** Clears the cache (logout / tests). */
export const clearDepartmentCache = () => departmentCache.clear();

/** Departments of the HR department master for an organisation (0 or '' = all organisations). */
export function useHrDepartments(orgId) {
  const key = String(Number(orgId) || 0);
  const [state, setState] = useState({ key: null, list: [] });
  useEffect(() => {
    let alive = true;
    loadDepartments(key)
      .then((list) => { if (alive) setState({ key, list }); })
      .catch(() => { if (alive) setState({ key, list: [] }); });
    return () => { alive = false; };
  }, [key]);
  return state.key === key ? state.list : [];
}

/**
 * Posts of a department in an organisation, for the Post filter. Empty until both are chosen
 * (post ids belong to one organisation). `posts` is narrowed to the chosen class; `deptPosts` is not.
 */
export function useDeptPosts(departmentId, orgId, className) {
  const key = departmentId && orgId ? `${orgId}|${departmentId}` : '';
  const [state, setState] = useState({ key: '', list: [] });
  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    fetchHrPostsByDepartment(departmentId, orgId)
      .then((res) => { if (alive) setState({ key, list: asList(res) }); })
      .catch(() => { if (alive) setState({ key, list: [] }); });
    return () => { alive = false; };
  }, [key, departmentId, orgId]);
  const deptPosts = key && state.key === key ? state.list : [];
  const posts = className ? deptPosts.filter((p) => Number(p.class_id) === CLASS_ID[className]) : deptPosts;
  return { deptPosts, posts };
}

/** Filter changes for a new class: a chosen post of another class is cleared (it would match nothing). */
export function classChangeUpdate(nextClass, postId, deptPosts) {
  const post = deptPosts.find((p) => String(p.post_id) === String(postId));
  const keepPost = !nextClass || !post || Number(post.class_id) === CLASS_ID[nextClass];
  return keepPost ? { className: nextClass } : { className: nextClass, postId: '' };
}
