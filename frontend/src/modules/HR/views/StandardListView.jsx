import React from 'react';
import VacancyManagement from '../pages/VacancyManagement';

export default function StandardListView(props) {
  return <VacancyManagement {...props} viewType="STANDARD" />;
}
