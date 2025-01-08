import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Paintbrush } from "lucide-react";

const defaultTheme = {
  variant: "professional" as const,
  primary: "hsl(222.2 47.4% 11.2%)",
  background: "hsl(0 0% 100%)",
  brandColors: {
    primary: "#000000",
    secondary: "#666666",
    accent: "#3498db",
  },
  appearance: "light" as const,
  radius: 0.5,
  typography: {
    fontFamily: "Inter, sans-serif",
    headingWeight: "600",
  },
  branding: {
    companyName: "",
    logoUrl: "",
    style: "minimal",
  },
};

export function ThemeCustomizer() {
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem("theme");
      return savedTheme ? JSON.parse(savedTheme) : defaultTheme;
    } catch (error) {
      console.error("Error parsing theme from localStorage:", error);
      return defaultTheme;
    }
  });
  const { toast } = useToast();

  const handleThemeChange = (field: string, value: any) => {
    const newTheme = { ...theme, [field]: value };
    setTheme(newTheme);
    try {
      localStorage.setItem("theme", JSON.stringify(newTheme));
      // Apply theme changes
      document.documentElement.style.setProperty(`--${field}`, value);
    } catch (error) {
      console.error("Error saving theme to localStorage:", error);
    }
  };

  const handleBrandColorChange = (colorType: keyof typeof defaultTheme.brandColors, value: string) => {
    const newTheme = {
      ...theme,
      brandColors: { ...theme.brandColors, [colorType]: value }
    };
    setTheme(newTheme);
    try {
      localStorage.setItem("theme", JSON.stringify(newTheme));
      document.documentElement.style.setProperty(`--brand-${colorType}`, value);
    } catch (error) {
      console.error("Error saving brand colors to localStorage:", error);
    }
  };

  const applyTheme = async () => {
    try {
      const response = await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
      });

      if (!response.ok) {
        throw new Error(`Failed to save theme: ${response.statusText}`);
      }

      toast({
        title: "Theme Updated",
        description: "Your theme changes have been saved.",
      });
    } catch (error) {
      console.error("Error saving theme:", error);
      toast({
        title: "Error",
        description: "Failed to save theme changes.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paintbrush className="h-5 w-5" />
          Theme Customization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Theme Variant</Label>
            <Select
              value={theme.variant}
              onValueChange={(value) => handleThemeChange("variant", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select variant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={theme.brandColors.primary}
                onChange={(e) => handleBrandColorChange("primary", e.target.value)}
              />
              <Input
                value={theme.brandColors.primary}
                onChange={(e) => handleBrandColorChange("primary", e.target.value)}
                placeholder="Primary color (HSL or HEX)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Border Radius</Label>
            <Input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={theme.radius}
              onChange={(e) => handleThemeChange("radius", parseFloat(e.target.value))}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label>Dark Mode</Label>
            <Switch
              checked={theme.appearance === "dark"}
              onCheckedChange={(checked) =>
                handleThemeChange("appearance", checked ? "dark" : "light")
              }
            />
          </div>
        </div>

        <Button onClick={applyTheme} className="w-full">
          Apply Theme Changes
        </Button>
      </CardContent>
    </Card>
  );
}