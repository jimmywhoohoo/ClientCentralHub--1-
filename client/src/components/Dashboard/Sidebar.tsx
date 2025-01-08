import { Link } from "wouter";
import { useUser } from "../../hooks/use-user";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Users,
  LogOut,
} from "lucide-react";

export function Sidebar() {
  const { user, logout } = useUser();

  return (
    <div className="w-64 bg-card border-r border-border p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-8">
        <FileText className="h-6 w-6" />
        <h1 className="text-xl font-bold">Client Portal</h1>
      </div>

      <nav className="space-y-2 flex-1">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>

        {user?.role === "admin" && (
          <Link href="/admin">
            <Button variant="ghost" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Admin
            </Button>
          </Link>
        )}

        <Link href="/settings">
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      </nav>

      <div className="space-y-4">
        <ThemeToggle />
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
