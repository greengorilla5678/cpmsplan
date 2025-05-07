import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const TABLE_HEADERS = [
  'No',
  'Strategic Objective',
  'Initiative',
  'Performance Measure/Main Activity',
  'Type',
  'Weight',
  'Baseline',
  'Target',
  'Period',
  'Implementor Team/Desk',
  'Budget'
];

export const exportToExcel = (data: any[], fileName: string) => {
  // Transform data to match table structure
  const excelData = data.map(row => ({
    'No': row.No || '',
    'Strategic Objective': row['Strategic Objective'] || '',
    'Initiative': row.Initiative || '',
    'Performance Measure/Main Activity': row['Performance Measure/Main Activity'] || '',
    'Type': row.Type || '',
    'Weight': row.Weight || '',
    'Baseline': row.Baseline || '',
    'Target': formatTarget(row.Target),
    'Period': formatPeriod(row.Period),
    'Implementor Team/Desk': row['Implementor Team/Desk'] || '',
    'Budget': formatBudget(row.Budget)
  }));

  const ws = utils.json_to_sheet(excelData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 5 },   // No
    { wch: 30 },  // Strategic Objective
    { wch: 25 },  // Initiative
    { wch: 30 },  // Performance Measure/Main Activity
    { wch: 15 },  // Type
    { wch: 10 },  // Weight
    { wch: 15 },  // Baseline
    { wch: 25 },  // Target
    { wch: 20 },  // Period
    { wch: 20 },  // Implementor Team/Desk
    { wch: 25 },  // Budget
  ];

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Plan');
  writeFile(wb, `${fileName}.xlsx`);
};

export const exportToPDF = (data: any[], fileName: string) => {
  const doc = new jsPDF('l', 'pt', 'a3'); // Use A3 landscape for better fit
  
  // Add title
  doc.setFontSize(16);
  doc.text('Ministry of Health - Plan Summary', 40, 40);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 40, 60);

  // Transform data to match table structure
  const tableData = data.map(row => [
    row.No || '',
    row['Strategic Objective'] || '',
    row.Initiative || '',
    row['Performance Measure/Main Activity'] || '',
    row.Type || '',
    row.Weight || '',
    row.Baseline || '',
    formatTarget(row.Target),
    formatPeriod(row.Period),
    row['Implementor Team/Desk'] || '',
    formatBudget(row.Budget)
  ]);

  // Add table
  autoTable(doc, {
    head: [TABLE_HEADERS],
    body: tableData,
    startY: 80,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [0, 100, 0], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 30 },     // No
      1: { cellWidth: 120 },    // Strategic Objective
      2: { cellWidth: 100 },    // Initiative
      3: { cellWidth: 120 },    // Performance Measure/Main Activity
      4: { cellWidth: 50 },     // Type
      5: { cellWidth: 40 },     // Weight
      6: { cellWidth: 60 },     // Baseline
      7: { cellWidth: 100 },    // Target
      8: { cellWidth: 80 },     // Period
      9: { cellWidth: 80 },     // Implementor Team/Desk
      10: { cellWidth: 100 }    // Budget
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    didDrawCell: (data) => {
      // Add custom styling for cells if needed
      if (data.section === 'body') {
        const row = tableData[data.row.index];
        if (row && row[4] === 'Performance Measure') {
          doc.setFillColor(239, 246, 255); // Light blue
        } else if (row && row[4] === 'Main Activity') {
          doc.setFillColor(240, 253, 244); // Light green
        }
      }
    }
  });

  doc.save(`${fileName}.pdf`);
};

// Helper functions to format data
const formatTarget = (target: any) => {
  if (!target || target === 'N/A') return 'N/A';
  if (typeof target === 'object') {
    return `Annual: ${target.annual}\nQ1: ${target.q1}\nQ2: ${target.q2}\nQ3: ${target.q3}\nQ4: ${target.q4}`;
  }
  return target;
};

const formatPeriod = (period: any) => {
  if (!period || period === 'N/A') return 'N/A';
  if (Array.isArray(period)) {
    return period.join(', ');
  }
  return period;
};

const formatBudget = (budget: any) => {
  if (!budget || budget === 'N/A') return 'N/A';
  if (typeof budget === 'object') {
    return `Total: $${budget.total.toLocaleString()}\n` +
           `Treasury: $${budget.treasury.toLocaleString()}\n` +
           `SDG: $${budget.sdg.toLocaleString()}\n` +
           `Partners: $${budget.partners.toLocaleString()}\n` +
           `Other: $${budget.other.toLocaleString()}`;
  }
  return budget;
};