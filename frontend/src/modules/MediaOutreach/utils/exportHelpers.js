import { SOCIAL_CHANNELS_KEYS, SOCIAL_METRICS } from './constants';

/**
  Copies the filtered table data as Tab-Separated Values (TSV) to the clipboard
 */
export function copyTableToClipboard({ gridApi, columnDefs, filteredRowData, activeMediaType, getOrgName, showYearWise, triggerNotification }) {
  if (!gridApi && !Array.isArray(filteredRowData)) return;

  let tsv = '';
  const headers = [];
  columnDefs.forEach(c => {
    if (c.children) {
      c.children.forEach(ch => {
        headers.push(`${c.headerName} - ${ch.headerName}`);
      });
    } else if (c.headerName) {
      headers.push(c.headerName);
    }
  });
  tsv += headers.join('\t') + '\n';
  
  filteredRowData.forEach((row, idx) => {
    const line = [
      idx + 1,
      getOrgName(row.organisation_id),
      row.financial_year
    ];
    if (!showYearWise) {
      line.push(row.month);
    }
    if (activeMediaType === 'broadcast') {
      line.push(row.broadcast_national ?? 0, row.broadcast_regional ?? 0, row.broadcast_overall ?? 0);
    } else if (activeMediaType === 'print_media') {
      line.push(row.print_media_national ?? 0, row.print_media_regional ?? 0, row.print_media_overall ?? 0);
    } else if (activeMediaType === 'online') {
      line.push(row.online_english ?? 0, row.online_vernacular ?? 0, row.online_overall ?? 0);
    } else if (activeMediaType === 'social_media') {
      SOCIAL_CHANNELS_KEYS.forEach(channel => {
        SOCIAL_METRICS.forEach(metric => {
          line.push(row[`${channel}_${metric}`] ?? 0);
        });
      });
    }
    tsv += line.join('\t') + '\n';
  });

  navigator.clipboard.writeText(tsv)
    .then(() => {
      if (triggerNotification) triggerNotification('Table data copied to clipboard!');
      else alert('Table data copied to clipboard!');
    })
    .catch(() => {
      if (triggerNotification) triggerNotification('Failed to copy table data.', 'error');
      else alert('Failed to copy table data.');
    });
}

/**
  Exports AG-Grid table contents to a CSV file
 */
export function exportTableCSV(gridApi, activeMediaType) {
  if (gridApi) {
    gridApi.exportDataAsCsv({
      marryChildren: true,
      fileName: `Media_Outreach_${activeMediaType}_Export.csv`
    });
  }
}

/**
  Opens printable window with styled HTML table for PDF saving or printing
 */
export function printTablePDF({ filteredRowData, activeMediaType, getOrgName, showYearWise }) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const title = `Media Outreach - ${activeMediaType === 'broadcast' ? 'Broadcast' : activeMediaType === 'print_media' ? 'Print Media' : activeMediaType === 'online' ? 'Online' : 'Social Media'}`;
  
  let tableHeaders = `<th>S.No</th><th>Organisation</th><th>Financial Year</th>${showYearWise ? '' : '<th>Month</th>'}`;
  if (activeMediaType === 'broadcast') {
    tableHeaders += '<th>National</th><th>Regional</th><th>Overall</th>';
  } else if (activeMediaType === 'print_media') {
    tableHeaders += '<th>National</th><th>Regional</th><th>Overall</th>';
  } else if (activeMediaType === 'online') {
    tableHeaders += '<th>English</th><th>Vernacular</th><th>Overall</th>';
  } else if (activeMediaType === 'social_media') {
    SOCIAL_CHANNELS_KEYS.forEach(ch => {
      const label = ch.charAt(0).toUpperCase() + ch.slice(1);
      SOCIAL_METRICS.forEach(m => {
        tableHeaders += `<th>${label} ${m}</th>`;
      });
    });
  }

  let tableRows = '';
  filteredRowData.forEach((row, idx) => {
    tableRows += '<tr>';
    tableRows += `<td>${idx + 1}</td>`;
    tableRows += `<td>${getOrgName(row.organisation_id)}</td>`;
    tableRows += `<td>${row.financial_year || ''}</td>`;
    if (!showYearWise) {
      tableRows += `<td>${row.month || ''}</td>`;
    }
    
    if (activeMediaType === 'broadcast') {
      tableRows += `<td>${row.broadcast_national ?? 0}</td><td>${row.broadcast_regional ?? 0}</td><td>${row.broadcast_overall ?? 0}</td>`;
    } else if (activeMediaType === 'print_media') {
      tableRows += `<td>${row.print_media_national ?? 0}</td><td>${row.print_media_regional ?? 0}</td><td>${row.print_media_overall ?? 0}</td>`;
    } else if (activeMediaType === 'online') {
      tableRows += `<td>${row.online_english ?? 0}</td><td>${row.online_vernacular ?? 0}</td><td>${row.online_overall ?? 0}</td>`;
    } else if (activeMediaType === 'social_media') {
      SOCIAL_CHANNELS_KEYS.forEach(ch => {
        SOCIAL_METRICS.forEach(m => {
          tableRows += `<td>${row[`${ch}_${m}`] ?? 0}</td>`;
        });
      });
    }
    tableRows += '</tr>';
  });

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0f417a; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 12px; color: #000; }
          th { background-color: #0f417a; color: white; }
        </style>
      </head>
      <body onload="window.print()">
        <h1>${title}</h1>
        <table>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
}
