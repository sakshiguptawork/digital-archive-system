export const isImageFile = (url = '') => /\.(png|jpe?g|gif|webp)$/i.test(url);

export const isEmbeddablePreview = (url = '') => /\.(pdf|txt|csv|json)$/i.test(url);

export const getPreservationBadgeClass = (status) => {
  if (status === 'Verified') return 'badge-verified';
  if (status === 'Needs Migration') return 'badge-migration';
  return 'badge-digitized';
};

export const getAccessBadgeClass = (accessLevel) =>
  accessLevel === 'restricted' ? 'badge-restricted' : 'badge-public';

export const getRequestStatusBadgeClass = (status) => {
  if (status === 'approved') return 'badge-approved';
  if (status === 'rejected') return 'badge-rejected';
  return 'badge-pending';
};

export const formatArchivalCitation = (doc) => {
  if (!doc) return '';
  const archivist = doc.uploadedBy?.name || 'Archive Staff';
  const year = doc.createdAt ? new Date(doc.createdAt).getFullYear() : '';
  return `${doc.title}. ${doc.category} (${doc.historicalEra}). Curated by ${archivist}, ChronicleVault Digital Archive${year ? `, ${year}` : ''}.`;
};

const escapeCsvField = (value) => {
  const str = String(value ?? '');
  return `"${str.replace(/"/g, '""')}"`;
};

/**
 * Triggers a browser CSV download for the provided document inventory array.
 */
export const exportInventoryToCsv = (documents) => {
  const headers = [
    'Title',
    'Category',
    'Historical Era',
    'Access Level',
    'Preservation Format',
    'Preservation Status',
    'Archived By',
    'Created At'
  ];

  const rows = documents.map((doc) => [
    doc.title,
    doc.category,
    doc.historicalEra,
    doc.accessLevel,
    doc.preservationFormat,
    doc.preservationStatus,
    doc.uploadedBy?.name || 'Archive Staff',
    doc.createdAt ? new Date(doc.createdAt).toISOString() : ''
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCsvField).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `chroniclevault-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
