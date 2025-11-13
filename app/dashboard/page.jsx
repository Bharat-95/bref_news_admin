"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  Search,
  Download,
  Bell,
  Settings,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Input } from "@/components/ui/input";
import PaginationBar from "./_components/Pagination";
import Modal from "./_components/Modal";
import { showToast } from "@/hooks/useToast";

/* --- Minimal, lightweight helpers --- */
function StatSmall({ label, value }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-4 py-3 flex flex-col">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="mt-1 text-lg font-medium text-gray-800">{value}</span>
    </div>
  );
}

function Tag({ children }) {
  return (
    <span className="text-[11px] px-2 py-0.5 bg-white border border-gray-100 rounded-full text-gray-600">
      {children}
    </span>
  );
}

/* --- Component --- */
export default function TrendyAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    totalArticles: 0,
    published: 0,
    totalUsers: 0,
  });
  const [articles, setArticles] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selected, setSelected] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  /* --- Data fetchers (kept intact) --- */
  const fetchCounts = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const [{ count: totalArticles }, { count: published }] =
        await Promise.all([
          supabaseBrowser
            .from("news_articles")
            .select("id", { count: "exact" }),
          supabaseBrowser
            .from("news_articles")
            .select("id", { count: "exact" })
            .lte("published_at", now),
        ]);
      const { count: totalUsers } = await supabaseBrowser
        .from("user_profiles")
        .select("id", { count: "exact" });
      setCounts({
        totalArticles: totalArticles || 0,
        published: published || 0,
        totalUsers: totalUsers || 0,
      });
    } catch (err) {
      showToast({
        title: "Error",
        description: "Failed to load counts",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabaseBrowser
        .from("news_articles")
        .select(
          "id,title,summary,image_url,source,published_at,topics,notified,categories,headline,source_url",
          { count: "exact" }
        );
      if (query) q = q.or(`title.ilike.%${query}%,summary.ilike.%${query}%`);
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      q = q.order("published_at", { ascending: false }).range(from, to);
      const { data, error, count } = await q;
      if (error) throw error;
      setArticles(data || []);
      setTotalRecords(count || 0);
    } catch (err) {
      showToast({
        title: "Error",
        description: "Failed to fetch articles",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, query]);

  const fetchChart = useCallback(async () => {
    try {
      const { data } = await supabaseBrowser.rpc("articles_per_day", {
        days: 14,
      });
      if (Array.isArray(data))
        setChartData(
          data.map((r) => ({ name: r.day, value: Number(r.count) || 0 }))
        );
    } catch (err) {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    fetchArticles();
    fetchChart();
  }, [fetchCounts, fetchArticles, fetchChart]);

  useEffect(() => {
    const t = setTimeout(() => fetchArticles(), 280);
    return () => clearTimeout(t);
  }, [query, page, limit, fetchArticles]);

  /* --- Actions --- */
  const toggleRow = (id) => {
    const s = new Set(selectedRows);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedRows(new Set(Array.from(s)));
  };

  const bulkMark = async () => {
    if (!selectedRows.size) return;
    const ids = Array.from(selectedRows);
    const { error } = await supabaseBrowser
      .from("news_articles")
      .update({ notified: true })
      .in("id", ids);
    if (error)
      showToast({
        title: "Error",
        description: "Bulk update failed",
        type: "error",
      });
    else {
      showToast({ title: "Marked notified" });
      setSelectedRows(new Set());
      fetchCounts();
      fetchArticles();
    }
  };

  const bulkDelete = async () => {
    if (!selectedRows.size) return;
    const ids = Array.from(selectedRows);
    const { error } = await supabaseBrowser
      .from("news_articles")
      .delete()
      .in("id", ids);
    if (error)
      showToast({
        title: "Error",
        description: "Bulk delete failed",
        type: "error",
      });
    else {
      showToast({ title: "Deleted" });
      setSelectedRows(new Set());
      fetchCounts();
      fetchArticles();
    }
  };

  const openPreview = (row) => {
    setSelected(row);
    setPreviewOpen(true);
  };
  const askDelete = (row) => {
    setRowToDelete(row);
    setConfirmOpen(true);
  };
  const doDelete = async () => {
    if (!rowToDelete) return;
    const { error } = await supabaseBrowser
      .from("news_articles")
      .delete()
      .eq("id", rowToDelete.id);
    if (error)
      showToast({
        title: "Error",
        description: "Delete failed",
        type: "error",
      });
    else {
      showToast({ title: "Deleted" });
      setConfirmOpen(false);
      setRowToDelete(null);
      fetchCounts();
      fetchArticles();
    }
  };

  /* --- UI classes: very light, minimal, subtle hover --- */
  const slimButton =
    "inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-blue-600 border border-gray-100 text-gray-700 text-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-indigo-100  text-white cursor-pointer";

  return (
    <div className="min-h-screen  text-gray-800 py-8">
      <div className=" mx-auto px-4">
        {/* Header: compact, thin text */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="flex items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title or summary..."
                className="pl-9 h-9 rounded-lg bg-white border border-gray-100 text-sm w-full"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={14} strokeWidth={1.2} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats row: minimal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
  <div className="p-4 rounded-xl border border-gray-100 bg-gradient-to-br from-blue-50 to-blue-100/40 flex items-center gap-4 hover:shadow-sm transition">
    <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center border border-white shadow-inner">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4 2 2 0 000-4zm0 6v2m-6 4h12m-9-4h6"/>
      </svg>
    </div>
    <div>
      <p className="text-xs text-blue-700/70">Articles</p>
      <p className="text-xl font-semibold text-blue-800">{counts.totalArticles}</p>
    </div>
  </div>

  <div className="p-4 rounded-xl border border-gray-100 bg-gradient-to-br from-green-50 to-green-100/40 flex items-center gap-4 hover:shadow-sm transition">
    <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center border border-white shadow-inner">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
      </svg>
    </div>
    <div>
      <p className="text-xs text-green-700/70">Published</p>
      <p className="text-xl font-semibold text-green-800">{counts.published}</p>
    </div>
  </div>

  <div className="p-4 rounded-xl border border-gray-100 bg-gradient-to-br from-purple-50 to-purple-100/40 flex items-center gap-4 hover:shadow-sm transition">
    <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center border border-white shadow-inner">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5V4H2v16h5m10 0v-4m0 4h-4m4 0h4"/>
      </svg>
    </div>
    <div>
      <p className="text-xs text-purple-700/70">Users</p>
      <p className="text-xl font-semibold text-purple-800">{counts.totalUsers}</p>
    </div>
  </div>
</div>


        {/* Articles list container */}
        <div className="bg-white border border-gray-100 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-medium text-gray-800">
              Latest articles
            </h2>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs text-gray-500 mr-2">Bulk</span>
              <label
                className={`inline-flex items-center w-11 h-6 p-1 rounded-full cursor-pointer ${
                  bulkMode ? "bg-indigo-400" : "bg-gray-200"
                }`}
              >
                <input
                  className="sr-only"
                  type="checkbox"
                  checked={bulkMode}
                  onChange={() => {
                    setBulkMode(!bulkMode);
                    setSelectedRows(new Set());
                  }}
                />
                <span
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition ${
                    bulkMode ? "translate-x-5" : ""
                  }`}
                />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            {articles.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.16 }}
                className="flex items-center gap-3 p-3 rounded-md border border-transparent hover:border-gray-100"
              >
                <div className="w-16 h-12 rounded-md bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-50">
                  <img
                    src={
                      a.image_url ||
                      `/api/og?title=${encodeURIComponent(a.title || "")}`
                    }
                    alt={a.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="truncate">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {a.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {a.summary ||
                          (a.headline && Array.isArray(a.headline)
                            ? a.headline[0]?.text
                            : "")}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {a.published_at
                        ? new Date(a.published_at).toLocaleString()
                        : "-"}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {Array.isArray(a.categories)
                        ? a.categories
                            .slice(0, 3)
                            .map((c, i) => <Tag key={i}>{c}</Tag>)
                        : null}
                      {a.topics && <Tag>{a.topics}</Tag>}
                    </div>

                    <div className="flex items-center gap-2">
                      {bulkMode && (
                        <input
                          type="checkbox"
                          checked={selectedRows.has(a.id)}
                          onChange={() => toggleRow(a.id)}
                          className="w-4 h-4"
                        />
                      )}
                      <button
                        onClick={() => openPreview(a)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:bg-gray-50"
                        title="Preview"
                      >
                        <Eye size={14} strokeWidth={1.2} />
                      </button>
                      <button
                        onClick={() =>
                          (window.location.href = `/dashboard/news/edit/${a.id}`)
                        }
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:bg-gray-50"
                        title="Edit"
                      >
                        <Edit size={14} strokeWidth={1.2} />
                      </button>
                      <button
                        onClick={() => askDelete(a)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={14} strokeWidth={1.2} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {loading && (
              <div className="py-6 text-center text-sm text-gray-400">
                Loading articles...
              </div>
            )}
            {!loading && !articles.length && (
              <div className="py-6 text-center text-sm text-gray-400">
                No articles found
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {bulkMode && (
                <>
                  <button
                    onClick={bulkMark}
                    className="h-9 px-3 rounded-md bg-white border border-gray-100 text-sm text-gray-700"
                  >
                    Mark notified
                  </button>
                  <button
                    onClick={bulkDelete}
                    className="h-9 px-3 rounded-md bg-white border border-gray-100 text-sm text-red-600"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedRows(new Set())}
                    className="h-9 px-3 rounded-md bg-white border border-gray-100 text-sm"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>

            <PaginationBar
              page={page}
              setPage={setPage}
              totalPage={Math.max(1, Math.ceil(totalRecords / limit))}
              totalRecord={totalRecords}
              limit={limit}
              setLimit={setLimit}
            />
          </div>
        </div>

        {/* Preview modal (kept simple) */}
        <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)}>
          <div className="max-w-2xl mx-auto p-4">
            <div className="flex items-start gap-4">
              <div className="w-36 h-24 rounded-md overflow-hidden bg-gray-50">
                <img
                  src={
                    selected?.image_url ||
                    `/api/og?title=${encodeURIComponent(selected?.title || "")}`
                  }
                  alt={selected?.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-medium text-gray-800">
                  {selected?.title}
                </h3>
                <div className="text-xs text-gray-500 mt-1">
                  {selected?.source} •{" "}
                  {selected?.published_at
                    ? new Date(selected.published_at).toLocaleString()
                    : "-"}
                </div>
                <p className="mt-3 text-sm text-gray-600">
                  {selected?.summary}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    className="h-9 px-3 rounded-md bg-white border border-gray-100 text-sm"
                    onClick={() =>
                      window.open(selected?.source_url || "#", "_blank")
                    }
                  >
                    Open source
                  </button>
                  <button
                    className="h-9 px-3 rounded-md bg-white border border-gray-100 text-sm"
                    onClick={async () => {
                      const { error } = await supabaseBrowser
                        .from("news_articles")
                        .update({ notified: true })
                        .eq("id", selected.id);
                      if (!error) {
                        showToast({ title: "Marked notified" });
                        fetchCounts();
                        fetchArticles();
                      }
                    }}
                  >
                    Mark notified
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Delete confirm */}
        <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <div className="max-w-md mx-auto p-4 text-center">
            <div className="text-base font-medium text-gray-800">
              Delete article?
            </div>
            <div className="text-xs text-gray-500 mt-2">
              This action cannot be undone
            </div>
            <div className="mt-4 flex justify-center gap-3">
              <button
                className="h-9 px-3 rounded-md bg-white border border-gray-100 text-sm"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="h-9 px-3 rounded-md bg-red-50 text-red-700 border border-red-100"
                onClick={doDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

/* --- CSV exporter --- */
async function exportCSV(rows) {
  if (!rows) return;
  const header = "id,title,source,published_at\n";
  const csv = rows
    .map((r) =>
      [r.id, r.title, r.source, r.published_at]
        .map((v) => `"${String(v || "")}"`)
        .join(",")
    )
    .join("\n");
  const blob = new Blob([header + csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `articles_export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
