// components/users/UserTable.tsx
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Info, Trash2, Pencil, Users } from "lucide-react";
import Modal from "@/app/dashboard/_components/Modal";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import PaginationBar from "@/app/dashboard/_components/Pagination";
import { toast } from "sonner";
import Link from "next/link";

interface User {
  id: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  bio?: string | null;
  updated_at?: string | null;
  // preserve optional fields if present in other contexts
  fb_chatbot_user_blocked?: boolean;
  website_last_opened?: string | null;
  created_at?: string | null;
}

interface UserTableProps {
  users: User[];
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  page: number;
  handleExportFile: any;
  totalRecord: number;
  limit: number;
  setLimit?: React.Dispatch<React.SetStateAction<number>>;
  setDeleteRefresh?: React.Dispatch<React.SetStateAction<any>>;
}

export const UserTable = ({
  users,
  setPage,
  totalPages,
  page,
  handleExportFile,
  totalRecord,
  limit,
  setLimit,
  setDeleteRefresh,
}: UserTableProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [rowData, setRowData] = useState<User | null>(null);
  const [selectedData, setSelectedData] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const formatToIndia = (iso?: string | null) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "-";
    }
  };

  const handleRefresh = () => {
    setPage(1);
    if (setDeleteRefresh) {
      setDeleteRefresh(Math.random());
    }
  };

  const handleUserDetails = (user: User) => {
    setSelectedData(user);
    setIsOpen(true);
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
        toast.error(data.error || "Failed to delete user");
        return;
      }

      toast.success("User deleted successfully!");
      handleRefresh();
      setIsConfirmOpen(false);
      setRowData(null);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlockUser = async (
    userId: string,
    isBlocked: boolean | undefined
  ) => {
    const newBlockStatus = !isBlocked;
    const { error } = await supabaseBrowser
      .from("user_profiles")
      .update({ fb_chatbot_user_blocked: newBlockStatus })
      .eq("id", userId);
    if (error) {
      toast.error(`Error ${newBlockStatus ? "blocking" : "unblocking"} user`);
    } else {
      toast.success(
        `User ${newBlockStatus ? "blocked" : "unblocked"} successfully!`
      );
      handleRefresh();
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-spacing-0">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200 ">
              <th className="text-left py-4 lg:px-4 md:px-4 px-3 font-medium text-gray-500 text-xs">
                User Id
              </th>
              <th className="text-left py-4 lg:px-4 md:px-4 px-3 font-medium text-gray-500 text-xs">
                NAME
              </th>
              <th className="text-left py-4 lg:px-4 md:px-4 px-3 font-medium text-gray-500 text-xs">
                EMAIL
              </th>
              <th className="text-left py-4 lg:px-4 md:px-4 px-3 font-medium text-gray-500 text-xs">
                JOIN DATE
              </th>
              <th className="text-left py-4 lg:px-4 md:px-4 px-3 font-medium text-gray-500 text-xs">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors lg:text-md md:text-md text-sm"
                >
                  <td className="py-4 px-4 text-gray-900">
                    {user.id || user.email || "—"}
                  </td>
                  <td className="py-4 px-4 text-gray-900">
                    {user.username || user.email || "—"}
                  </td>
                  <td className="py-4 px-4 text-gray-900">
                    {user.email || "—"}
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    {user.updated_at
                      ? formatToIndia(user.updated_at)
                      : user.created_at
                      ? formatToIndia(user.created_at)
                      : "-"}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-gray-200"
                        onClick={() => {
                          setIsConfirmOpen(true);
                          setRowData(user);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>

                      <button
                        onClick={() => handleUserDetails(user)}
                        className="cursor-pointer p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                      >
                        <Info className="w-4 h-4" />
                      </button>

                      <Link href={`/dashboard/users/${user.id}/edit`}>
                        <button className="cursor-pointer p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="h-[20vh]">
                  <div className="flex flex-col justify-center items-center h-full text-gray-900">
                    <FileText className="w-16 h-16 text-gray-400 mb-4" />
                    <h2 className="text-2xl font-medium mb-2">No Data Found</h2>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-4">
          <PaginationBar
            page={page}
            setPage={setPage}
            totalPage={totalPages}
            totalRecord={totalRecord}
            limit={limit}
            setLimit={setLimit}
          />
        </div>
      </div>

      <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
        <h2 className="text-lg font-semibold mb-2">Are you sure?</h2>
        <p className="text-sm text-gray-600 mb-4">
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsConfirmOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteUser}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="max-w-md max-h-[90vh] overflow-y-auto mx-auto bg-white p-6">
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <h2 className="text-2xl font-medium text-gray-800">
              {selectedData?.username || selectedData?.email || "User"}
            </h2>
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full ${
                selectedData?.role === "user"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {selectedData?.role ? selectedData.role.toUpperCase() : "-"}
            </span>
          </div>

          <div className="space-y-3 text-sm text-gray-500">
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Name:</span>
              <span>{selectedData?.username || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Email:</span>
              <span>{selectedData?.email || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Role:</span>
              <span>{selectedData?.role || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Bio:</span>
              <span className="break-all">{selectedData?.bio || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Updated At:</span>
              <span>
                {selectedData?.updated_at
                  ? formatToIndia(selectedData.updated_at)
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
export default UserTable;
