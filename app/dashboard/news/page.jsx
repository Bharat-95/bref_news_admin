"use client";

import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Edit,
  Info,
  Upload,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Modal from "../_components/Modal";
import { Card, CardContent } from "@/components/ui/card";
import PaginationBar from "../_components/Pagination";
import { showToast } from "@/hooks/useToast";

export default function NewsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    summary: "",
    imageFile: null,
    image_url: "",
    source_url: "",
    source: "",
    topics: "",
    categories: "",
    published_at: "",
  });

  const [editForm, setEditForm] = useState({
    id: "",
    title: "",
    summary: "",
    image_url: "",
    source_url: "",
    source: "",
    topics: "",
    categories: "",
    published_at: "",
  });

  const totalPages = Math.ceil(total / limit);

  const formatTS = (d) => {
    const iso = d.toISOString();
    return iso.replace("T", " ").replace("Z", "+00");
  };

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabaseBrowser
        .from("news_articles")
        .select("*", { count: "exact" });
      if (searchTerm) {
        query = query.or(
          `title.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%`
        );
      }
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.order("published_at", { ascending: false }).range(from, to);
      const { data, error, count } = await query;
      if (error) throw error;
      setArticles(data || []);
      setTotal(count || 0);
    } catch (err) {
      showToast({ title: "Error", description: "Failed to fetch articles", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchArticles();
    }, 300);
    return () => clearTimeout(t);
  }, [fetchArticles]);

  const uploadImage = async (file) => {
    if (!file) return null;
    try {
      setUploading(true);
      const ext = file.name.split(".").pop();
      const id = uuidv4();
      const path = `news/${id}.${ext}`;
      const { error: uploadError } = await supabaseBrowser.storage
        .from("news-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabaseBrowser.storage.from("news-images").getPublicUrl(path);
      return data?.publicUrl || null;
    } catch (err) {
      showToast({ title: "Error", description: "Image upload failed", type: "error" });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      if (!form.title) throw new Error("Title required");
      let image_url = form.image_url || null;
      if (form.imageFile) {
        const uploaded = await uploadImage(form.imageFile);
        if (uploaded) image_url = uploaded;
      }
      const publishedDate = form.published_at ? new Date(form.published_at) : new Date();
      const createdDate = new Date();
      const payload = {
        title: form.title || null,
        summary: form.summary || null,
        image_url,
        source_url: form.source_url || null,
        source: form.source || null,
        topics: form.topics || null,
        published_at: formatTS(publishedDate),
        pub_date: formatTS(publishedDate),
        created_at: formatTS(createdDate),
        categories: form.categories
          ? form.categories.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        headline: [{ text: form.title || "", generated_at: formatTS(createdDate) }],
      };
      const { error } = await supabaseBrowser.from("news_articles").insert(payload);
      if (error) throw error;
      setDialogOpen(false);
      setForm({
        title: "",
        summary: "",
        imageFile: null,
        image_url: "",
        source_url: "",
        source: "",
        topics: "",
        categories: "",
        published_at: "",
      });
      fetchArticles();
      showToast({ title: "Success", description: "Article added" });
    } catch (err) {
      showToast({ title: "Error", description: err?.message || "Failed to add article", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item) => {
    setEditForm({
      id: item.id,
      title: item.title || "",
      summary: item.summary || "",
      image_url: item.image_url || "",
      source_url: item.source_url || "",
      source: item.source || "",
      topics: item.topics || "",
      categories: Array.isArray(item.categories) ? item.categories.join(", ") : (item.categories ? String(item.categories) : ""),
      published_at: item.published_at ? new Date(item.published_at).toISOString().slice(0, 16) : "",
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      if (!editForm.id) throw new Error("Invalid article");
      let image_url = editForm.image_url || null;
      const publishedDate = editForm.published_at ? new Date(editForm.published_at) : new Date();
      const payload = {
        title: editForm.title || null,
        summary: editForm.summary || null,
        image_url,
        source_url: editForm.source_url || null,
        source: editForm.source || null,
        topics: editForm.topics || null,
        published_at: formatTS(publishedDate),
        pub_date: formatTS(publishedDate),
        categories: editForm.categories
          ? editForm.categories.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        headline: [{ text: editForm.title || "", updated_at: formatTS(new Date()) }],
      };
      const { error } = await supabaseBrowser.from("news_articles").update(payload).eq("id", editForm.id);
      if (error) throw error;
      setEditOpen(false);
      setEditForm({
        id: "",
        title: "",
        summary: "",
        image_url: "",
        source_url: "",
        source: "",
        topics: "",
        categories: "",
        published_at: "",
      });
      fetchArticles();
      showToast({ title: "Success", description: "Article updated" });
    } catch (err) {
      showToast({ title: "Error", description: err?.message || "Failed to update", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (row) => {
    setRowToDelete(row);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!rowToDelete) return;
    setLoading(true);
    try {
      const { error } = await supabaseBrowser.from("news_articles").delete().eq("id", rowToDelete.id);
      if (error) throw error;
      setConfirmOpen(false);
      setRowToDelete(null);
      fetchArticles();
      showToast({ title: "Success", description: "Article deleted" });
    } catch (err) {
      showToast({ title: "Error", description: "Delete failed", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-white p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <form onSubmit={(e) => e.preventDefault()} className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground text-gray-600" />
            <Input placeholder="Search title or summary..." className="pl-9 pr-4 py-2 w-full text-black border-gray-300" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
          </form>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => setDialogOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white">
              <Plus />
              Add News
            </Button>
          </div>
        </div>

        {articles.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold">No articles</h3>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Published</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topics</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {articles.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{a.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{a.source || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{a.published_at ? a.published_at : "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{a.topics || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setSelected(a); setPreviewOpen(true); }}><Info className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => confirmDelete(a)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4">
              <PaginationBar page={page} setPage={setPage} totalPage={totalPages} totalRecord={total} limit={limit} setLimit={setLimit} />
            </div>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Article</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Summary</label>
                <Input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Image</label>
                <div className="flex items-center gap-2">
                  <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] || null })} />
                  <span>{form.imageFile?.name || form.image_url || "No image"}</span>
                  <button className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded" disabled>{uploading ? "Uploading..." : <Upload />}</button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Source</label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Source URL</label>
                <Input value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Topics</label>
                <Input value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Categories (comma separated)</label>
                <Input value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Published At</label>
                <Input type="datetime-local" value={form.published_at} onChange={(e) => setForm({ ...form, published_at: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="bg-red-600 text-white">Cancel</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-blue-600 text-white">{saving ? "Saving..." : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Article</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Summary</label>
                <Input value={editForm.summary} onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Image URL</label>
                <Input value={editForm.image_url} onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Source</label>
                <Input value={editForm.source} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Source URL</label>
                <Input value={editForm.source_url} onChange={(e) => setEditForm({ ...editForm, source_url: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Topics</label>
                <Input value={editForm.topics} onChange={(e) => setEditForm({ ...editForm, topics: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Categories (comma separated)</label>
                <Input value={editForm.categories} onChange={(e) => setEditForm({ ...editForm, categories: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Published At</label>
                <Input type="datetime-local" value={editForm.published_at} onChange={(e) => setEditForm({ ...editForm, published_at: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)} className="bg-red-600 text-white">Cancel</Button>
              <Button onClick={handleUpdate} disabled={saving} className="bg-blue-600 text-white">{saving ? "Saving..." : "Update"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)}>
          <Card className="max-w-2xl w-full mx-auto p-4 text-black border-0">
            <CardContent>
              <h2 className="text-xl font-semibold">{selected?.title}</h2>
              <p className="text-sm text-gray-600">{selected?.source} • {selected?.published_at || "-"}</p>
              {selected?.image_url && <img src={selected.image_url} alt={selected.title} className="w-full mt-4 rounded" />}
              <p className="mt-4">{selected?.summary}</p>
              <p className="mt-4 text-sm text-gray-700">Topics: {selected?.topics || "-"}</p>
              <p className="mt-2 text-sm text-gray-700">Categories: {Array.isArray(selected?.categories) ? selected.categories.join(", ") : selected?.categories || "-"}</p>
              <div className="mt-4">
                <a href={selected?.source_url || "#"} target="_blank" rel="noreferrer" className="text-blue-600">Read source</a>
              </div>
            </CardContent>
          </Card>
        </Modal>

        <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <div className="p-4 text-black">
            <h3 className="text-lg font-semibold">Delete Article?</h3>
            <p className="text-sm text-gray-600 mt-2">This action cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} className="bg-blue-600 text-white">Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} className="bg-red-600 text-white">Delete</Button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}
