import { Link } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationCenter } from "./NotificationCenter";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

export function Sidebar() {
  const { user, logout } = useUser();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border p-4 flex flex-col transition-transform duration-200 ease-in-out",
          {
            "translate-x-0": isOpen,
            "-translate-x-full": !isOpen,
          }
        )}
      >
        <div className="flex items-center gap-2 mb-8">
          <FileText className="h-6 w-6" />
          <h1 className="text-xl font-bold">Client Portal</h1>
        </div>

        <nav className="space-y-2 flex-1 touch-pan-y overflow-y-auto">
          <Link href="/">
            <Button
              variant="ghost"
              className="w-full justify-start touch-manipulation"
              onClick={() => isMobile && setIsOpen(false)}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>

          {user?.role === "admin" && (
            <Link href="/admin">
              <Button
                variant="ghost"
                className="w-full justify-start touch-manipulation"
                onClick={() => isMobile && setIsOpen(false)}
              >
                <Users className="mr-2 h-4 w-4" />
                Admin
              </Button>
            </Link>
          )}

          <Link href="/settings">
            <Button
              variant="ghost"
              className="w-full justify-start touch-manipulation"
              onClick={() => isMobile && setIsOpen(false)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
        </nav>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationCenter />
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start touch-manipulation"
            onClick={() => {
              logout();
              isMobile && setIsOpen(false);
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Mobile overlay */}
        {isMobile && isOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    </>
  );
}