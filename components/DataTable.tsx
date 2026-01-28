import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  Column,
  Table,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown, ExternalLink, Search, X } from 'lucide-react';
import { FeedItem } from '../types';
import { formatDate } from '../utils';

interface DataTableProps {
  data: FeedItem[];
}

function Filter({ column, table }: { column: Column<FeedItem, unknown>; table: Table<FeedItem> }) {
  const columnFilterValue = column.getFilterValue();

  const sortedUniqueValues = useMemo(
    () =>
      Array.from(column.getFacetedUniqueValues().keys())
        .sort()
        .slice(0, 5000),
    [column.getFacetedUniqueValues()]
  );

  const isCategorical = ['publication'].includes(column.id);

  if (isCategorical) {
    return (
      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        <div className="relative group">
            <select
            value={columnFilterValue?.toString() || ''}
            onChange={e => column.setFilterValue(e.target.value || undefined)}
            className="w-full text-xs font-mono text-ink bg-sepia border-b border-ink/30 focus:border-accent rounded-none py-1 px-1 pr-4 appearance-none focus:outline-none cursor-pointer placeholder:text-stone-400"
            aria-label={`Filter ${column.id}`}
            >
            <option value="">All</option>
            {sortedUniqueValues.map((value: any) => (
                <option value={value} key={value}>
                {value}
                </option>
            ))}
            </select>
            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" size={10} />
        </div>
      </div>
    );
  }

  // Text Input for Search
  return (
    <div className="mt-2 relative group" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        value={(columnFilterValue as string) ?? ''}
        onChange={e => column.setFilterValue(e.target.value)}
        placeholder={`Search...`}
        className="w-full text-xs font-mono bg-transparent border-b border-stone-300 focus:border-accent py-1 pl-1 pr-4 text-ink focus:outline-none placeholder:text-stone-400 italic"
        aria-label={`Search ${column.id}`}
      />
      {columnFilterValue && (
        <button 
            onClick={() => column.setFilterValue(undefined)}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-accent hover:text-ink transition-colors"
        >
            <X size={10} />
        </button>
      )}
    </div>
  );
}

const DataTable: React.FC<DataTableProps> = ({ data }) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columns = useMemo<ColumnDef<FeedItem>[]>(
    () => [
      {
        header: 'Headline / Title',
        accessorKey: 'title',
        enableColumnFilter: true,
        cell: info => (
          <div className="min-w-[300px] max-w-[500px]">
            <a 
              href={info.row.original.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-ink hover:text-accent font-serif font-bold flex items-start gap-1 transition-colors leading-snug text-sm hover:underline decoration-1 underline-offset-2"
            >
              {info.getValue() as string}
            </a>
          </div>
        ),
      },
      {
        header: 'Publication',
        accessorKey: 'publication',
        enableColumnFilter: true,
        cell: info => <span className="font-branding text-xs uppercase tracking-wide text-stone-600">{info.getValue() as string}</span>,
      },
      {
        header: 'Date',
        accessorKey: 'publishedAt',
        enableColumnFilter: false,
        cell: info => <span className="text-stone-600 whitespace-nowrap text-xs font-mono">{formatDate(info.getValue() as string)}</span>,
      },
      {
        header: 'Section / Tags',
        accessorFn: row => {
            if (row.categories && row.categories.length > 0) {
                const uniqueNames = Array.from(new Set(row.categories.map(c => c.name)));
                return uniqueNames.join(', ');
            }
            return row.primaryCategory?.name || '';
        },
        id: 'category',
        enableColumnFilter: true,
        cell: info => {
          const allCats = info.row.original.categories || [];
          const primary = info.row.original.primaryCategory;
          
          let catsToRender: {name: string}[] = [];
          
          if (allCats.length > 0) {
             const seen = new Set<string>();
             catsToRender = allCats.filter(c => {
                 if (!c.name) return false;
                 if (seen.has(c.name)) return false;
                 seen.add(c.name);
                 return true;
             });
          } else if (primary) {
              catsToRender = [primary];
          }

          return (
            <div className="flex flex-wrap gap-1 max-w-[250px]">
                {catsToRender.length > 0 ? (
                    catsToRender.slice(0, 3).map((cat, i) => (
                        <span key={i} className="text-[10px] font-mono text-stone-500 border border-stone-300 px-1 bg-white/50">
                            {cat.name}
                        </span>
                    ))
                ) : (
                    <span className="text-stone-300 text-xs">-</span>
                )}
            </div>
          );
        },
      },
      {
        header: 'Byline',
        accessorFn: row => row.authors.map(a => a.name).join(', '),
        id: 'authors',
        enableColumnFilter: true,
        cell: info => <span className="text-stone-600 text-xs font-serif italic truncate max-w-[150px] block" title={info.getValue() as string}>{info.getValue() as string}</span>,
      },
      {
        header: 'W.C.',
        accessorKey: 'wordcount',
        enableColumnFilter: false,
        cell: info => <span className="text-stone-500 text-xs font-mono text-right block">{info.getValue() as number}</span>,
      }
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
        pagination: {
            pageSize: 50,
        }
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
      <div className="border-2 border-ink bg-paper p-1 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-sepia border-b-2 border-ink">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-4 py-3 align-top font-branding font-bold text-ink select-none text-xs uppercase tracking-widest border-r border-ink/20 last:border-r-0"
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      <div className="flex flex-col gap-2">
                        <div 
                            className={`flex items-center gap-1.5 cursor-pointer hover:text-accent transition-colors ${header.column.getCanSort() ? '' : 'cursor-default'}`}
                            onClick={header.column.getToggleSortingHandler()}
                        >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && (
                                <span className="text-stone-400">
                                    {{
                                    asc: <ChevronUp size={12} className="text-ink" />,
                                    desc: <ChevronDown size={12} className="text-ink" />,
                                    }[header.column.getIsSorted() as string] ?? <ChevronsUpDown size={12} />}
                                </span>
                            )}
                        </div>
                        {header.column.getCanFilter() ? (
                          <Filter column={header.column} table={table} />
                        ) : (
                          <div className="h-8"></div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-ink/20">
              {table.getRowModel().rows.map(row => (
                <tr 
                    key={row.id} 
                    className="group hover:bg-sepia/30 transition-colors"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 align-top text-sm border-r border-ink/10 last:border-r-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {table.getRowModel().rows.length === 0 && (
            <div className="py-24 text-center border-t border-ink/20">
                <div className="w-16 h-16 border border-stone-300 rounded-full flex items-center justify-center mx-auto mb-4 bg-sepia">
                    <Search className="text-stone-400" size={24} />
                </div>
                <h3 className="font-display font-bold text-ink mb-1">Ledger Empty</h3>
                <p className="font-serif italic text-stone-500 text-sm">No entries found for the current criteria.</p>
            </div>
        )}

        <div className="px-4 py-3 border-t-2 border-ink flex flex-col sm:flex-row items-center justify-between bg-sepia/50 gap-4 font-mono text-xs">
          <div className="flex items-center gap-4 text-stone-600">
            <span>
                Record <span className="font-bold text-ink">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span> -{' '}
                <span className="font-bold text-ink">{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)}</span> of <span className="font-bold text-ink">{data.length}</span>
            </span>
            <div className="h-4 w-px bg-stone-300"></div>
            <div className="flex items-center gap-2">
                <span className="uppercase tracking-wide text-[10px] text-stone-500">Limit:</span>
                <select
                    value={table.getState().pagination.pageSize}
                    onChange={e => {
                        table.setPageSize(Number(e.target.value))
                    }}
                    className="bg-transparent border-b border-stone-400 py-0.5 pr-6 pl-1 text-ink focus:outline-none focus:border-accent cursor-pointer font-bold"
                >
                    {[10, 20, 50, 100, 200].map(pageSize => (
                        <option key={pageSize} value={pageSize}>
                            {pageSize}
                        </option>
                    ))}
                </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 border border-ink bg-paper hover:bg-ink hover:text-paper disabled:opacity-40 disabled:hover:bg-paper disabled:hover:text-ink disabled:cursor-not-allowed text-xs font-bold uppercase transition-colors"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Prev Page
            </button>
            <button
              className="px-3 py-1 border border-ink bg-paper hover:bg-ink hover:text-paper disabled:opacity-40 disabled:hover:bg-paper disabled:hover:text-ink disabled:cursor-not-allowed text-xs font-bold uppercase transition-colors"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTable;