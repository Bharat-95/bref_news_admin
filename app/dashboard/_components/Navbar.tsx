import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw, Download } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { usePathname } from "next/navigation";
import { exportToExcel } from "@/lib/exportToExcel";
import { showToast } from "@/hooks/useToast";
import { useEffect, useState } from "react";
import { exportDashboardToExcel } from "@/lib/exportDashboard";
import { RootState } from "@/store/store";

interface NavbarProps {
  sidebarCollapsed?: boolean;
  setSidebarCollapsed?: (collapsed: boolean) => void;
  setSidebarOpen?: (open: boolean) => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
}

const pathName: any = {
  "/dashboard": "Dashboard",
  "/dashboard/users": "User Management",
  "/dashboard/settings": "Settings",
  "/dashboard/admin": "Admin Management",
  "/dashboard/users/[id]/edit": "Edit User Details",
  "/dashboard/news":"News"
};

const Navbar = ({ setCollapsed, collapsed }: NavbarProps) => {
  const dispatch = useDispatch();
  const pathname = usePathname();
  const [seminarId, setSeminarId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("seminarId");
    setSeminarId(id);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };



  

  useEffect(() => {
    const fetchUserRole = async () => {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();

      if (user) {
        const { data, error } = await supabaseBrowser
          .from("user-profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!error && data?.role) {
          setUserRole(data.role);
        }
      }
    };

    fetchUserRole();
  }, []);

  
  const stats = useSelector((state: RootState) => state.dashboard);
  const tab = useSelector((state: RootState) => state.dashboard.SeminarTabName);

  
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed?.(!collapsed)}
          className="h-10 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-6 w-6 text-black" />
          ) : (
            <ChevronLeft className="h-6 w-6 text-black" />
          )}
        </Button>
        <span className="lg:text-lg md:text-md text-sm font-bold text-gray-800">
          {(() => {
            let title = pathName[pathname] || "";

            // Handle User Subscription page
            if (
              pathname.startsWith("/dashboard/users/") &&
              pathname.split("/").length === 4
            ) {
              title = pathName["/dashboard/users/[id]"];
            }

            if (
              pathname.startsWith("/dashboard/users/") &&
              pathname.endsWith("/edit")
            ) {
              title = pathName["/dashboard/users/[id]/edit"];
            }
              if (
              pathname.startsWith("/dashboard/users/") &&
              pathname.endsWith("/leads")
            ) {
              title = pathName["/dashboard/users/[id]/leads"];
            }

            if (pathname === "/dashboard" && userRole) {
              return `${title} - ${
                userRole.charAt(0).toUpperCase() + userRole.slice(1)
              }`;
            }

            return title;
          })()}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="cursor-pointer text-gray-600 hover:text-gray-900"
          aria-label="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};

export default Navbar;
