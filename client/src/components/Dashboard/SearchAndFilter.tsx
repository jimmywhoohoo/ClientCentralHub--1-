import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface FilterOptions {
  status?: string;
  priority?: string;
  dateRange?: string;
  search: string;
}

interface SearchAndFilterProps {
  onFilterChange: (filters: FilterOptions) => void;
  showStatus?: boolean;
}

export function SearchAndFilter({ onFilterChange, showStatus = true }: SearchAndFilterProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    status: "all",
    priority: "all",
    dateRange: "all",
    search: "",
  });

  const updateFilters = (key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      status: "all",
      priority: "all",
      dateRange: "all",
      search: "",
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const activeFiltersCount = Object.values(filters).filter(value => value !== "all" && value !== "").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8"
              value={filters.search}
              onChange={(e) => updateFilters("search", e.target.value)}
            />
          </div>
        </div>

        {showStatus && (
          <Select
            value={filters.status}
            onValueChange={(value) => updateFilters("status", value)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Select
          value={filters.priority}
          onValueChange={(value) => updateFilters("priority", value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.dateRange}
          onValueChange={(value) => updateFilters("dateRange", value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>

        {activeFiltersCount > 0 && (
          <Button
            variant="outline"
            size="icon"
            onClick={clearFilters}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(filters).map(([key, value]) => {
            if (value === "all" || value === "") return null;
            return (
              <Badge key={key} variant="secondary">
                {key === "search" ? `"${value}"` : value}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}