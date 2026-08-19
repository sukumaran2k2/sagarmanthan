import React from 'react';
import DataList from '../pages/DataList';

export default function StandardListView(props) {
  return <DataList {...props} isStandardView={true} />;
}
