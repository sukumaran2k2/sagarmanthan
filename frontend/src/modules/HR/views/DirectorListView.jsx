import React from 'react';
import VacancyManagement from '../pages/VacancyManagement';

export default function DirectorListView(props) {
  return <VacancyManagement {...props} viewType="DIRECTOR" />;
}
