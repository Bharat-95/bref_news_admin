"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

type UserProfile = {
  id: string;
  updated_at?: string | null;
  username?: string | null;
  email?: string | null;
  bio?: string | null;
  role?: string | null;
};

export default function EditUserForm({ user }: { user: UserProfile }) {
  const router = useRouter();
  const [formData, setFormData] = useState<UserProfile>({ ...user });
  const [loading, setLoading] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        const session = (data as any)?.session;
        if (session?.user?.id) {
          const { data: loggedInUser, error } = await supabaseBrowser
            .from("user_profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          if (!error && loggedInUser) {
            setIsSuperadmin(loggedInUser.role === "superadmin");
          }
        }
      } catch (err) {
        // ignore
      }
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      username: user.username ?? null,
      email: user.email ?? null,
      bio: user.bio ?? null,
      role: user.role ?? null,
      updated_at: user.updated_at ?? null,
    }));
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value } as UserProfile));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload: Partial<UserProfile> = {
      username: formData.username ?? null,
      email: formData.email ?? null,
      bio: formData.bio ?? null,
      role: formData.role ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseBrowser
      .from("user_profiles")
      .update(payload)
      .eq("id", user.id);

    if (!error) {
      setLoading(false);
      router.push("/dashboard/users");
      router.refresh();
    } else {
      setLoading(false);
      alert("Error updating user: " + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white text-black p-4 grid grid-cols-1 gap-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700">Username</label>
        <Input
          name="username"
          value={formData.username ?? ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700">Email</label>
        <Input
          name="email"
          type="email"
          value={formData.email ?? ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
        />
      </div>

      <div className="col-span-1">
        <label className="block text-sm font-semibold text-gray-700">Bio</label>
        <Textarea
          name="bio"
          value={formData.bio ?? ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700">Role</label>
        <select
          name="role"
          value={formData.role ?? ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md p-2 border border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
        >
          <option value="">Select role</option>
          <option value="user">user</option>
          <option value="admin">admin</option>
          <option value="superadmin">superadmin</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700">Last Updated</label>
        <Input
          value={formData.updated_at ? new Date(formData.updated_at).toLocaleString() : ""}
          readOnly
          className="mt-1 block w-full rounded-md border-gray-200 bg-gray-50 text-sm"
        />
      </div>

      <div className="flex gap-4 mt-2">
        <Link
          href={`/dashboard/users`}
          className="w-48 py-2 px-3 text-md rounded-lg text-white bg-gray-600 flex items-center justify-center"
        >
          Back
        </Link>

        <button
          type="submit"
          disabled={loading}
          className="w-48 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update User"}
        </button>
      </div>
    </form>
  );
}
