import { FeedItem } from './types';

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export interface ColumnDefinition {
  id: string;
  label: string;
  accessor: (item: FeedItem) => string | number;
}

export const AVAILABLE_COLUMNS: ColumnDefinition[] = [
  { id: 'source', label: 'Source File', accessor: (item) => item.source || 'Unknown' },
  { id: 'id', label: 'ID', accessor: (item) => item.id },
  { id: 'title', label: 'Title', accessor: (item) => item.title || '' },
  { id: 'publication', label: 'Publication', accessor: (item) => item.publication },
  { id: 'publishedAt', label: 'Published At', accessor: (item) => formatDate(item.publishedAt) },
  { id: 'authors', label: 'Authors', accessor: (item) => item.authors.map(a => a.name).join('; ') },
  { id: 'primaryCategory', label: 'Primary Category', accessor: (item) => item.primaryCategory?.name || '' },
  { id: 'allCategories', label: 'All Categories', accessor: (item) => item.categories.map(c => c.name).join('; ') },
  { id: 'region', label: 'Region', accessor: (item) => item.region || '' },
  { id: 'wordcount', label: 'Word Count', accessor: (item) => item.wordcount },
  { id: 'readtime', label: 'Read Time (min)', accessor: (item) => item.readtime },
  { id: 'url', label: 'URL', accessor: (item) => item.url },
  { id: 'summary', label: 'Summary', accessor: (item) => item.summary || '' }
];

export const exportToCSV = (items: FeedItem[], selectedColumnIds: string[]) => {
  if (!items || items.length === 0) return;

  const columnsToExport = AVAILABLE_COLUMNS.filter(col => selectedColumnIds.includes(col.id));
  
  // Sort columns based on the order they appear in AVAILABLE_COLUMNS (preserves logical grouping)
  // or you could respect the order of selection if passed that way. Here we stick to definition order.

  const headers = columnsToExport.map(col => col.label);

  const csvContent = [
    headers.join(','),
    ...items.map(item => {
      const row = columnsToExport.map(col => {
        const value = col.accessor(item);
        if (typeof value === 'string') {
          // Escape quotes and wrap in quotes
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      return row.join(',');
    })
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `legal_feed_export_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
