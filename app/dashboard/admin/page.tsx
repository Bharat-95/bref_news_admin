"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Edit,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";
import ComingSoon from "@/components/ui/coming-soon";
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
import { useRouter } from "next/navigation";
import { showToast } from "@/hooks/useToast";
import { exportToExcel } from "@/lib/exportToExcel";
import PaginationBar from "../_components/Pagination";

type UserProfile = {
  id: string;
  username?: string | null;
  bio?: string | null;
  updated_at?: string | null;
  role?: string | null;
  email?: string | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isOpenDeleted, setIsOpenDeleted] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [newProfile, setNewProfile] = useState<
    UserProfile & { password?: string }
  >({
    id: crypto.randomUUID(),
    username: "",
    bio: "",
    updated_at: "",
    role: "",
    email: "",
    password: "",
  });

  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const confirmOpen = userToDelete !== null;
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<any>(null);
  const [rowData, setRowData] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const totalPages = Math.ceil(total / limit);

  const [isEditing, setIsEditing] = useState(false);
  const [editProfile, setEditProfile] = useState<UserProfile>({
    id: "",
    username: "",
    bio: "",
    updated_at: "",
    role: "",
    email: "",
  });
  const [deleteRefresh, setDeleteRefresh] = useState<any>(null);

  const handleRefresh = () => {
    setPage(1);
    setDeleteRefresh(Math.random());
  };

  const handleDeleteUser = async () => {
    if (!rowData) return;
    try {
      setLoading(true);
      const res = await fetch("/api/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: rowData.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast({
          title: "Error",
          description: `Failed to delete user`,
          type: "error",
        });
        return;
      }

      showToast({
        type:'success',
        title: "Success",
        description: `Admin deleted successfully`,
      });
      handleRefresh();
      setIsConfirmOpen(false);
      setRowData(null);
    } catch (err: any) {
      showToast({
        type:'error',
        title: "Error",
        description: `Failed to delete user`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabaseBrowser
        .from("user_profiles")
        .select("*", { count: "exact" })
        .in("role", ["admin", "superadmin"]);

      if (searchTerm) {
        // search by username or email
        query = query.or(
          `username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query.order("updated_at", { ascending: false }).range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error("Supabase fetch error:", error);
        setError(error.message);
      } else {
        setAdmins((data as UserProfile[]) || []);
        setTotal(count || 0);
      }
    } catch (error: any) {
      console.error("Failed to fetch profiles:", error);
      setError(error.message || "Failed to fetch profiles");
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm]);

  useEffect(() => {
    const handler = setTimeout(() => {
      handleFetchProfiles();
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, page, limit, deleteRefresh, handleFetchProfiles]);

  if (loading && admins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center h-screen">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-lg font-semibold text-gray-800">Loading...</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm">
          Please wait while we fetch the latest data for you.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <ComingSoon />
      </div>
    );
  }

  async function confirmDelete() {
    if (!userToDelete) return;

    const userToRemove = userToDelete;
    setIsDeleting(true);

    setAdmins((prev) => prev.filter((s) => s.id !== userToRemove.id));
    setUserToDelete(null);

    try {
      // call your serverless function that deletes auth user & profile (keeps previous pattern)
      const response = await fetch(
        "https://rjdxfptgivaptsmtxrcj.supabase.co/functions/v1/delete-admin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userToRemove.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error("Failed to delete user via function:", result);
        showToast({
          type: "error",
          title: "Error",
          description:
            result?.message || "Something went wrong during deletion!",
        });
        setAdmins((prev) => [...prev, userToRemove]);
      } else {
        showToast({
          type:'success',
          title: "Success",
          description: "Admin Deleted!",
        });
        handleRefresh();
      }
    } catch (error: any) {
      console.error("Deletion error:", error);
      showToast({
        type: "error",
        title: "Error",
        description: error.message || "Something went wrong during deletion!",
      });
      setAdmins((prev) => [...prev, userToRemove]);
    } finally {
      setIsDeleting(false);
    }
  }

  const handleEditForm = (user: UserProfile) => {
    setEditProfile(user);
    setIsEditing(true);
  };

  const handleExportFile = async () => {
    try {
      const { data, error } = await supabaseBrowser
        .from("user_profiles")
        .select("*")
        .in("role", ["admin", "superadmin"])
        .order("updated_at", { ascending: false });

      if (error) {
        throw new Error("Failed to fetch data for export!");
      }
      await exportToExcel(data, "admin_user_profiles");
      showToast({
        type:'success',
        title: "Success",
        description: "Data exported successfully!",
      });
    } catch (error: any) {
      console.error("Export error:", error);
      showToast({
        type: "error",
        title: "Error",
        description: error?.message || "Something went wrong during export!",
      });
    }
  };

  // Create new auth user and corresponding user_profiles row
  const handleAddNewAdmin = async () => {
    setSaving(true);
    try {
      if (
        !newProfile.email ||
        !newProfile.username ||
        !newProfile.password ||
        !newProfile.role
      ) {
        throw new Error(
          "All fields (Email, Username, Role, Password) are required!"
        );
      }

      const { data: signUpData, error: signUpError } =
        await supabaseBrowser.auth.signUp({
          email: newProfile.email,
          password: newProfile.password!,
          options: {
            data: {
              username: newProfile.username,
              role: newProfile.role,
            },
          },
        });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (signUpData?.user?.id) {
        const insertPayload = {
          id: signUpData.user.id,
          username: newProfile.username,
          bio: newProfile.bio || null,
          role: newProfile.role,
          email: newProfile.email,
        };

        const { error: insertError } = await supabaseBrowser
          .from("user_profiles")
          .insert(insertPayload);

        if (insertError) {
          console.error(
            "Error inserting profile in 'user_profiles' table:",
            insertError
          );
          throw new Error("Failed to create user profile!");
        }
      } else {
        throw new Error("User creation succeeded but no user ID returned.");
      }

      setNewProfile({
        id: crypto.randomUUID(),
        username: "",
        bio: "",
        updated_at: "",
        role: "",
        email: "",
        password: "",
      });
      setDialogOpen(false);
      showToast({
        type:'success',
        title: "Success",
        description: `${formatRole(newProfile.role)} created successfully!`,
      });

      setPage(1);
      handleFetchProfiles();
    } catch (error: any) {
      console.error("Add new admin error:", error);
      showToast({
        type: "error",
        title: "Error",
        description:
          error?.message || "Something went wrong while creating admin!",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAdmin = async () => {
    setSaving(true);
    try {
      const { error: updateError } = await supabaseBrowser
        .from("user_profiles")
        .update({
          username: editProfile?.username,
          bio: editProfile?.bio,
          role: editProfile?.role,
          email: editProfile?.email,
        })
        .eq("id", editProfile?.id);

      if (updateError) {
        throw new Error(updateError?.message);
      }

      setEditProfile({
        id: "",
        username: "",
        bio: "",
        updated_at: "",
        role: "",
        email: "",
      });
      setIsEditing(false);
      showToast({
        type:'success',
        title: "Success",
        description: "Admin Updated!",
      });
      setPage(1);
      if (page === 1) {
        handleFetchProfiles();
      }
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Error",
        description: error?.message || "Something went wrong!",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatRole = (role: string | null | undefined) => {
    if (!role) return "";
    return role === "superadmin"
      ? "Super Admin"
      : role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <>
      <div className="min-h-screen bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          {/* Search Input */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className="relative lg:w-[80%] md:w-[80%]  w-full"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Username or Email..."
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-md w-full text-black"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              disabled={loading && admins.length === 0}
            />
          </form>

          {/* Add New Admin Button */}
          <button
            onClick={() => {
              setNewProfile({
                id: crypto.randomUUID(),
                username: "",
                bio: "",
                updated_at: "",
                role: "",
                email: "",
                password: "",
              });
              setDialogOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-colors duration-200 w-full sm:w-auto justify-center"
            title="Add New Admin"
          >
            <Plus className="h-5 w-5" />
            <span>Add New Admin</span>
          </button>
        </div>

        {admins.length === 0 && !loading && !error ? (
          <div className="flex flex-col justify-center items-center text-gray-900 p-6 border rounded-lg bg-gray-50 mt-8">
            <FileText className="w-16 h-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">
              No Admin Users Found
            </h2>
            <p className="text-gray-500 text-center max-w-md">
              It looks like there are no administrative users matching your
              criteria. Click "Add New Admin" to get started or clear your
              search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow-md lg:w-full md:w-full w-[320px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.map((admmin) => (
                  <tr key={admmin.id} className="hover:bg-gray-50">
                    <td className="break-words px-6 py-4 text-sm font-medium text-gray-900">
                      {admmin?.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="flex items-center">
                        {admmin?.username}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="flex items-center">
                        {formatRole(admmin?.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {admmin?.updated_at
                        ? new Date(admmin.updated_at).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-4 ">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-gray-200"
                          onClick={() => {
                            setIsConfirmOpen(true);
                            setRowData(admmin);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                        <button
                          disabled={loading}
                          onClick={() => {
                            handleEditForm(admmin);
                          }}
                          className="cursor-pointer p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          disabled={loading}
                          onClick={() => {
                            setSelectedData(admmin);
                            setIsOpen(true);
                          }}
                          className="cursor-pointer p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-auto">
              <PaginationBar
                page={page}
                setPage={setPage}
                totalPage={totalPages}
                totalRecord={total}
                limit={limit}
                setLimit={setLimit}
              />
            </div>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Create New Admin
              </DialogTitle>
            </DialogHeader>

            {/* form fields */}
            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={newProfile.email || ""}
                  onChange={(e) =>
                    setNewProfile({ ...newProfile, email: e.target.value })
                  }
                  required
                />
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Username</label>
                <Input
                  value={newProfile.username || ""}
                  onChange={(e) =>
                    setNewProfile({ ...newProfile, username: e.target.value })
                  }
                  required
                />
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Role</label>
                <select
                  className="w-full h-11 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 px-3"
                  value={newProfile.role || ""}
                  onChange={(e) =>
                    setNewProfile({ ...newProfile, role: e.target.value })
                  }
                  required
                >
                  <option value="" disabled>
                    Select Role
                  </option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              {/* Bio (optional) */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Bio (optional)</label>
                <Input
                  value={newProfile.bio || ""}
                  onChange={(e) =>
                    setNewProfile({ ...newProfile, bio: e.target.value })
                  }
                />
              </div>

              {/* Password */}
              <div className="space-y-1 relative">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newProfile.password || ""}
                    onChange={(e) =>
                      setNewProfile({ ...newProfile, password: e.target.value })
                    }
                    required
                    className="pr-10"
                  />
                  <span
                    className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="bg-red-600 text-white"
              >
                Cancel
              </Button>
              <Button
                disabled={saving}
                onClick={handleAddNewAdmin}
                className="bg-blue-600 text-white"
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={confirmOpen}
          onOpenChange={(o) => {
            !o && setUserToDelete(null);
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Admin?</DialogTitle>
            </DialogHeader>

            <p className="text-sm text-gray-600">
              This action can’t be undone. The{" "}
              <span className="font-semibold">
                {formatRole(userToDelete?.role)}
              </span>{" "}
              user will be permanently removed.
            </p>

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                className="cursor-pointer"
                disabled={isDeleting}
                onClick={() => {
                  setUserToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={() => {
                  confirmDelete();
                }}
                className="cursor-pointer"
              >
                {isDeleting ? "Loading ..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
        <h2 className="text-lg font-semibold mb-2 text-black">Are you sure?</h2>
        <p className="text-sm text-gray-600 mb-4">
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsConfirmOpen(false)}
            disabled={loading}
            className="bg-blue-600 text-white"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteUser}
            disabled={loading}
            className="bg-red-600 text-white"
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <Card className="max-w-md w-full mx-auto shadow-md border mt-5 p-4 rounded-2xl bg-white">
          <CardContent className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Admin Details
            </h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-gray-700">
              <div className="font-medium">Email:</div>
              <div> {selectedData?.email}</div>

              <div className="font-medium">Username:</div>
              <div> {selectedData?.username}</div>

              <div className="font-medium">Role:</div>
              <div>
                <span className="flex items-center">
                  {formatRole(selectedData?.role)}
                </span>
              </div>

              <div className="font-medium">Updated:</div>
              <div>
                {selectedData?.updated_at
                  ? new Date(selectedData.updated_at).toLocaleString()
                  : "-"}
              </div>

              <div className="font-medium">Bio:</div>
              <div>{selectedData?.bio || "-"}</div>
            </div>
          </CardContent>
        </Card>
      </Modal>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edit Admin
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Email */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={editProfile?.email || ""}
                onChange={(e) =>
                  setEditProfile({ ...editProfile, email: e.target.value })
                }
                required
              />
            </div>

            {/* Username */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Username</label>
              <Input
                type="text"
                value={editProfile?.username || ""}
                onChange={(e) =>
                  setEditProfile({ ...editProfile, username: e.target.value })
                }
                required
              />
            </div>

            {/* Role */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Role</label>
              <select
                className="w-full h-11 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 px-3"
                value={editProfile.role || ""}
                onChange={(e) =>
                  setEditProfile({ ...editProfile, role: e.target.value })
                }
                required
              >
                <option value="" disabled>
                  Select Role
                </option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Bio</label>
              <Input
                value={editProfile?.bio || ""}
                onChange={(e) =>
                  setEditProfile({ ...editProfile, bio: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setEditProfile({
                  id: "",
                  username: "",
                  bio: "",
                  updated_at: "",
                  role: "",
                  email: "",
                });
              }}
              disabled={saving}
              className="bg-red-600 text-white"
            >
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={handleUpdateAdmin}
              className="bg-blue-600 text-white"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
