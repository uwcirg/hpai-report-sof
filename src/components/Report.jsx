import { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TextField,
  Select,
  MenuItem,
  Button,
  Chip,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  InputAdornment,
  Stack,
  Card,
  CardContent,
  Divider,
  useMediaQuery,
  useTheme,
  FormControl,
  InputLabel,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import FilterListIcon from "@mui/icons-material/FilterList";
import { getEnv } from "@util";

const ENV_API_URL = getEnv("REACT_APP_REPORT_URL");
const API_URL = ENV_API_URL ? ENV_API_URL : "https://aidbox.hpai.doh.dev.cirg.uw.edu/$query/aidboxquery_hpai_qr_report";

// Columns shown in the mobile card view (excludes csvOnly and notes columns for brevity)
const MOBILE_VISIBLE_KEYS = [
  "name_given",
  "name_family",
  "birthdate",
  "authored",
  "contact_with_infected_person",
  "contact_with_sick_dead_animals",
  "raw_animal_foods",
];

const sortNullableDate = (rowA, rowB, columnId) => {
  const dateA = rowA.getValue(columnId);
  const dateB = rowB.getValue(columnId);

  // Safely get the time value, defaulting to 0 for null/undefined
  const timeA = dateA ? new Date(dateA).getTime() : 0;
  const timeB = dateB ? new Date(dateB).getTime() : 0;

  // Basic comparison
  return timeA === timeB ? 0 : timeA > timeB ? 1 : -1;
};

// Sorts string values alphabetically with null/undefined always sorted last,
// regardless of sort direction. Registered as a named sortingFn on the table.
const nullsLastSortingFn = (rowA, rowB, columnId) => {
  const valA = rowA.getValue(columnId);
  const valB = rowB.getValue(columnId);

  const aEmpty = valA == null || valA === "";
  const bEmpty = valB == null || valB === "";

  if (aEmpty && bEmpty) return 0;
  // Returning 1 and -1 here instead of the usual positive/negative means
  // TanStack will flip these with sort direction — so we use Infinity to
  // pin nulls last independently of direction.
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  return valA.localeCompare(valB);
};

// Mark the function so TanStack always treats null rows as last regardless
// of sort direction (asc or desc).
nullsLastSortingFn.autoRemove = (val) => !val;
sortNullableDate.autoRemove = (val) => !val;

const COLUMNS = [
  {
    accessorKey: "name_given",
    header: "First Name",
    size: 120,
    enableColumnFilter: true,
  },
  {
    accessorKey: "name_family",
    header: "Last Name",
    size: 120,
    enableColumnFilter: true,
  },
  {
    accessorKey: "birthdate",
    header: "Date of Birth",
    size: 120,
    enableColumnFilter: true,
  },
  {
    accessorKey: "patient_setting",
    header: "Setting",
    size: 120,
    enableColumnFilter: false,
    meta: { csvOnly: true },
  },
  {
    accessorKey: "authored",
    header: "Authored",
    size: 180,
    enableColumnFilter: true,
    cell: ({ getValue }) => {
      const val = getValue();
      if (!val) return "—";
      return new Date(val).toLocaleString();
    },
    sortingFn: "sortNullableDate",
  },
  {
    accessorKey: "contact_with_infected_person",
    header: "Contact w/ Infected Person",
    size: 120,
    enableColumnFilter: true,
    meta: { filterVariant: "select", filterOptions: ["Yes", "No"] },
    cell: ({ getValue }) => renderYesNo(getValue()),
    sortingFn: "nullsLastSortingFn",
  },
  {
    accessorKey: "contact_with_infected_person_notes",
    header: "Infected Person Notes",
    size: 220,
    enableColumnFilter: false,
    cell: ({ getValue }) => renderNotes(getValue()),
    meta: { csvOnly: true },
  },
  {
    accessorKey: "contact_with_sick_dead_animals",
    header: "Contact w/ Sick/Dead Animals",
    size: 120,
    enableColumnFilter: true,
    meta: { filterVariant: "select", filterOptions: ["Yes", "No"] },
    cell: ({ getValue }) => renderYesNo(getValue()),
    sortingFn: "nullsLastSortingFn",
  },
  {
    accessorKey: "contact_with_sick_dead_animals_notes",
    header: "Animals Notes",
    size: 220,
    enableColumnFilter: false,
    meta: { csvOnly: true },
    cell: ({ getValue }) => renderNotes(getValue()),
  },
  {
    accessorKey: "raw_animal_foods",
    header: "Raw Animal Foods",
    size: 160,
    enableColumnFilter: true,
    meta: { filterVariant: "select", filterOptions: ["Yes", "No"] },
    cell: ({ getValue }) => renderYesNo(getValue()),
    sortingFn: "nullsLastSortingFn",
  },
  {
    accessorKey: "raw_animal_foods_notes",
    header: "Raw Foods Notes",
    size: 200,
    enableColumnFilter: false,
    meta: { csvOnly: true },
    cell: ({ getValue }) => renderNotes(getValue()),
  },
  {
    accessorKey: "qr_id",
    header: "QR ID",
    size: 120,
    enableColumnFilter: false,
    meta: { csvOnly: true },
  },
  {
    accessorKey: "patient_id",
    header: "Patient ID",
    size: 120,
    enableColumnFilter: false,
    meta: { csvOnly: true },
  },
];

function renderYesNo(value) {
  if (!value) return "—";
  const color = value === "Yes" ? "error" : value === "No" ? "success" : "default";
  return <Chip label={value} size="small" color={color} variant="outlined" />;
}

function renderNotes(value) {
  if (!value) return "—";
  return (
    <Tooltip title={value} arrow>
      <Typography
        variant="body2"
        sx={{
          maxWidth: 200,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          cursor: "help",
        }}
      >
        {value}
      </Typography>
    </Tooltip>
  );
}

// Per-column filter input
function ColumnFilter({ column }) {
  const meta = column.columnDef.meta ?? {};
  const filterValue = column.getFilterValue() ?? "";

  if (meta.filterVariant === "select") {
    return (
      <Select
        size="small"
        displayEmpty
        value={filterValue}
        onChange={(e) => column.setFilterValue(e.target.value || undefined)}
        sx={{ fontSize: 12, minWidth: 80, width: "100%", bgcolor: "#FFF" }}
      >
        <MenuItem value="" sx={{ fontSize: 12 }}>
          Select
        </MenuItem>
        {(meta.filterOptions ?? []).map((opt) => (
          <MenuItem key={opt} value={opt} sx={{ fontSize: 12 }}>
            {opt}
          </MenuItem>
        ))}
      </Select>
    );
  }

  return (
    <TextField
      size="small"
      placeholder="Filter"
      value={filterValue}
      onChange={(e) => column.setFilterValue(e.target.value || undefined)}
      inputProps={{ style: { fontSize: 12, padding: "8px 6px" } }}
      sx={{ width: "100%", bgcolor: "#FFF" }}
      InputProps={{
        endAdornment: filterValue ? (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => column.setFilterValue(undefined)}>
              <ClearIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
    />
  );
}

// Mobile filter panel — shown as stacked dropdowns/inputs below the toolbar
function MobileFilterPanel({ table, columnFilters, onClearFilters }) {
  const filterableColumns = table.getAllColumns().filter((col) => col.getCanFilter());

  if (filterableColumns.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1 }}>
      <Stack spacing={2}>
        {filterableColumns.map((col) => {
          const meta = col.columnDef.meta ?? {};
          const label = col.columnDef.header;
          return (
            <Box key={col.id}>
              {meta.filterVariant === "select" ? (
                <FormControl size="small" fullWidth>
                  <InputLabel sx={{ fontSize: 12 }}>{label}</InputLabel>
                  <Select
                    displayEmpty
                    value={col.getFilterValue() ?? ""}
                    onChange={(e) => col.setFilterValue(e.target.value || undefined)}
                    sx={{ fontSize: 12 }}
                  >
                    <MenuItem value=""></MenuItem>
                    {(meta.filterOptions ?? []).map((opt) => (
                      <MenuItem key={opt} value={opt} sx={{ fontSize: 12 }}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  size="small"
                  fullWidth
                  label={label}
                  placeholder={`Filter by ${label}`}
                  value={col.getFilterValue() ?? ""}
                  onChange={(e) => col.setFilterValue(e.target.value || undefined)}
                  InputLabelProps={{ sx: { fontSize: 12 } }}
                  inputProps={{ style: { fontSize: 12 } }}
                  InputProps={{
                    endAdornment: col.getFilterValue() ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => col.setFilterValue(undefined)}>
                          <ClearIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                />
              )}
            </Box>
          );
        })}
        {columnFilters.length > 0 && (
          <Button
            variant="outlined"
            color="warning"
            size="small"
            startIcon={<FilterListOffIcon />}
            onClick={onClearFilters}
            fullWidth
          >
            Clear all filters ({columnFilters.length})
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

// Mobile card row — renders a single row as a stacked key/value card
function MobileCard({ row }) {
  const visibleCells = row.getVisibleCells().filter((cell) => MOBILE_VISIBLE_KEYS.includes(cell.column.id));

  // Find the name cells to use as the card title
  const firstName = row.original.name_given ?? "";
  const lastName = row.original.name_family ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Unknown Patient";
  const authored = row.original.authored ? new Date(row.original.authored).toLocaleString() : null;

  // All cells except name fields (shown in header)
  const detailCells = visibleCells.filter((cell) => !["name_given", "name_family"].includes(cell.column.id));

  return (
    <Card variant="outlined" sx={{ mb: 1 }}>
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
          <Typography variant="subtitle2" fontWeight={700}>
            {fullName}
          </Typography>
          {authored && (
            <Typography variant="caption" color="text.secondary">
              {authored}
            </Typography>
          )}
        </Stack>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={0.5}>
          {detailCells
            .filter((cell) => cell.column.id !== "authored")
            .map((cell) => (
              <Stack key={cell.column.id} direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, mr: 1 }}>
                  {cell.column.columnDef.header}:
                </Typography>
                <Typography sx={{ textAlign: "right" }} variant="body2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Typography>
              </Stack>
            ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

// PropTypes
const columnMetaPropType = PropTypes.shape({
  filterVariant: PropTypes.oneOf(["select", "text"]),
  filterOptions: PropTypes.arrayOf(PropTypes.string),
  csvOnly: PropTypes.bool,
});

const columnPropType = PropTypes.shape({
  getFilterValue: PropTypes.func.isRequired,
  setFilterValue: PropTypes.func.isRequired,
  getCanFilter: PropTypes.func.isRequired,
  columnDef: PropTypes.shape({
    header: PropTypes.string,
    size: PropTypes.number,
    meta: columnMetaPropType,
  }).isRequired,
});

ColumnFilter.propTypes = {
  column: columnPropType.isRequired,
};

MobileFilterPanel.propTypes = {
  table: PropTypes.object.isRequired,
  columnFilters: PropTypes.array.isRequired,
  onClearFilters: PropTypes.func.isRequired,
};

MobileCard.propTypes = {
  row: PropTypes.object.isRequired,
};

// Deduplicate rows — keep the most recent authored entry per patient
function removeNullsByPatient(data) {
  const map = new Map();
  for (const row of data) {
    const existing = map.get(row.patient_id);
    if (!existing && row.authored != null) {
      map.set(row.patient_id, row);
    }
  }
  return Array.from(map.values());
}

function exportToCsv(rows, allColumns) {
  const headers = allColumns.map((col) => col.header);
  const csvRows = rows.map((row) =>
    allColumns.map((col) => {
      const val = row.original[col.accessorKey] ?? "";
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }),
  );

  const csvContent = [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hpai_qr_report_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Report({ removeNulls = true }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [columnFilters, setColumnFilters] = useState([]);
  const [sorting, setSorting] = useState([{ id: "authored", desc: true }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [columnVisibility, setColumnVisibility] = useState(() =>
    Object.fromEntries(COLUMNS.filter((col) => col.meta?.csvOnly).map((col) => [col.accessorKey, false])),
  );
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      const rows = Array.isArray(json) ? json : (json.data ?? []);
      setRawData(rows);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const data = useMemo(() => (removeNulls ? removeNullsByPatient(rawData) : rawData), [rawData, removeNulls]);

  const table = useReactTable({
    data,
    columns: COLUMNS,
    state: { columnFilters, sorting, pagination, columnVisibility },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false,
    sortingFns: {
      sortNullableDate: sortNullableDate,
      nullsLastSortingFn: nullsLastSortingFn,
    },
  });

  const filteredRows = table.getFilteredRowModel().rows;

  const handleClearFilters = () => {
    setColumnFilters([]);
    setShowMobileFilters(false);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {/* Toolbar */}
      {!loading && (
        <Stack direction="row" alignItems="flex-end" justifyContent="space-between" mb={1} flexWrap="wrap" gap={1}>
          <Typography variant="body2" color="text.secondary">
            {filteredRows.length} of {data.length} records
          </Typography>
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            {/* Mobile: toggle filter panel */}
            {isMobile && (
              <Button
                size="small"
                variant={showMobileFilters ? "contained" : "outlined"}
                startIcon={<FilterListIcon />}
                onClick={() => setShowMobileFilters((v) => !v)}
                color={columnFilters.length > 0 ? "warning" : "primary"}
              >
                Filters{columnFilters.length > 0 ? ` (${columnFilters.length})` : ""}
              </Button>
            )}

            {/* Desktop: clear filters button */}
            {!isMobile && columnFilters.length > 0 && (
              <Tooltip title="Clear all column filters">
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  startIcon={<FilterListOffIcon />}
                  onClick={handleClearFilters}
                >
                  Clear filters ({columnFilters.length})
                </Button>
              </Tooltip>
            )}

            <Tooltip title="Refresh data">
              <IconButton onClick={fetchData} disabled={loading} size={isMobile ? "small" : "medium"}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => exportToCsv(filteredRows, COLUMNS)}
              disabled={filteredRows.length === 0}
            >
              {isMobile ? "CSV" : "Export CSV"}
            </Button>
          </Stack>
        </Stack>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (
        <>
          {/* Mobile filter panel */}
          {isMobile && showMobileFilters && (
            <MobileFilterPanel table={table} columnFilters={columnFilters} onClearFilters={handleClearFilters} />
          )}

          {/* Mobile: card list */}
          {isMobile ? (
            <>
              {filteredRows.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No records found
                </Typography>
              ) : (
                <>
                  {table.getRowModel().rows.map((row) => (
                    <MobileCard key={row.id} row={row} />
                  ))}
                  <TablePagination
                    component="div"
                    count={filteredRows.length}
                    page={pagination.pageIndex}
                    rowsPerPage={pagination.pageSize}
                    rowsPerPageOptions={[10, 25, 50]}
                    onPageChange={(_, page) => setPagination((p) => ({ ...p, pageIndex: page }))}
                    onRowsPerPageChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
                    sx={{ ".MuiTablePagination-toolbar": { flexWrap: "wrap" } }}
                  />
                </>
              )}
            </>
          ) : (
            /* Desktop: full table */
            <Paper variant="outlined">
              <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                          const canSort = header.column.getCanSort();
                          const sortDir = header.column.getIsSorted();
                          return (
                            <TableCell
                              key={header.id}
                              sx={{
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                                minWidth: header.column.columnDef.size,
                                bgcolor: "grey.50",
                              }}
                            >
                              {canSort ? (
                                <TableSortLabel
                                  active={!!sortDir}
                                  direction={sortDir || "asc"}
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                </TableSortLabel>
                              ) : (
                                flexRender(header.column.columnDef.header, header.getContext())
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}

                    {/* Per-column filter row */}
                    <TableRow>
                      {table.getHeaderGroups()[0].headers.map((header) => (
                        <TableCell key={header.id} sx={{ bgcolor: "grey.50", py: 0.5, px: 1 }}>
                          {header.column.getCanFilter() ? <ColumnFilter column={header.column} /> : null}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {table.getRowModel().rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 6 }}>
                          <Typography color="text.secondary">No records found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} sx={{ maxWidth: cell.column.columnDef.size }}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={filteredRows.length}
                page={pagination.pageIndex}
                rowsPerPage={pagination.pageSize}
                rowsPerPageOptions={[10, 25, 50, 75, 100]}
                onPageChange={(_, page) => setPagination((p) => ({ ...p, pageIndex: page }))}
                onRowsPerPageChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
              />
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}

Report.propTypes = {
  removeNulls: PropTypes.bool,
};

Report.defaultProps = {
  removeNulls: true,
};
