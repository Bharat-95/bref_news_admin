"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchAndFilter } from "@/components/userComponents/SearchAndFilter";
import { UserTable } from "@/components/userComponents/UserTable";
import ComingSoon from "@/components/ui/coming-soon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import PhoneInput from "react-phone-input-2";
import { showToast } from "@/hooks/useToast";
import { exportToExcel } from "@/lib/exportToExcel";

type NewUser = {
  fullname: string;
  email: string;
  phone: string;
};

const ITEMS_PER_PAGE = 10;

function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    fullname: "",
    email: "",
    phone: "",
  });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(ITEMS_PER_PAGE);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / limit);
  const [deleteRefresh, setDeleteRefresh] = useState<any>(null);

  useEffect(() => {
    const handleFetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        let query: any = supabaseBrowser
          .from("user_profiles")
          .select("*", { count: "exact" })
          .eq("role", "user")
          .order("updated_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (searchTerm?.trim()) {
          query = query.or(
            `email.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`
          );
        }

        const { data, error, count } = await query;

        if (error) {
          console.error(error);
          setError(error.message);
          setUsers([]);
          setTotal(0);
        } else {
          setUsers(data || []);
          setTotal(count || 0);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch user data");
        setUsers([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    handleFetchUsers();
  }, [page, searchTerm, limit, deleteRefresh]);

  const handleExportFile = async () => {
    try {
      const { data, error } = await supabaseBrowser
        .from("user_profiles")
        .select("*", { count: "estimated" })
        .order("updated_at", { ascending: false });

      if (error) throw error;
      await exportToExcel(data, "user_profiles");
      showToast({ title: "Success", description: "Export completed" });
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
  };

  const createUser = async () => {
    setSaving(true);

    if (!newUser.phone) {
      setSaving(false);
      showToast({
        title: "error",
        description: "Phone number is required.",
      });
      return;
    }
    if (!newUser.email) {
      setSaving(false);
      showToast({
        title: "error",
        description: "Email is required.",
      });
      return;
    }
    if (!newUser.fullname) {
      setSaving(false);
      showToast({
        title: "error",
        description: "Name is required.",
      });
      return;
    }

    try {
      const { error } = await supabaseBrowser.from("user_profiles").insert({
        id: crypto.randomUUID(),
        username: newUser.fullname,
        email: newUser.email,
        role: "user",
        bio: null,
      });

      if (error) {
        setSaving(false);
        showToast({
          title: "error",
          description: "Something went wrong!",
        });
        return;
      } else {
        setDialogOpen(false);
        setNewUser({ fullname: "", email: "", phone: "" });
        setDeleteRefresh(Date.now());
        showToast({ title: "Success", description: "User created" });
      }
    } catch (err) {
      console.error(err);
      showToast({ title: "Error", description: "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <SearchAndFilter
          searchTerm={searchTerm}
          onSearchChange={(v) => {
            setSearchTerm(v);
            setPage(1);
          }}
          planFilter={planFilter}
          onPlanFilterChange={(v) => {
            setPlanFilter(v);
            setPage(1);
          }}
          statusFilter={statusFilter}
          onStatusFilterChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        />

        <Card className="border border-gray-200 shadow-sm lg:w-full md:w-full w-[320px] overflow-x-auto ">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 bg-gray-100 animate-pulse rounded-md"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="p-4">
                <ComingSoon />
              </div>
            ) : (
              <UserTable
                users={users || []}
                handleExportFile={handleExportFile}
                setPage={setPage}
                page={page}
                totalPages={totalPages}
                limit={limit}
                totalRecord={total}
                setLimit={setLimit}
                setDeleteRefresh={setDeleteRefresh}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">Create New User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={newUser.fullname}
                onChange={(e) => setNewUser({ ...newUser, fullname: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">WhatsApp Number</label>
            <PhoneInput
              country="ca"
              value={newUser.phone}
              onChange={(val, data: any) => {
                const finalVal = val.startsWith("+") ? val : `+${val}`;
                setNewUser({ ...newUser, phone: finalVal });
              }}
              inputClass="!w-full !h-11 !text-sm !border !border-gray-300 !rounded-md focus:ring-2 focus:ring-primary"
              buttonClass="!border-gray-300"
              enableSearch
            />
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={createUser}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default UsersPage;
