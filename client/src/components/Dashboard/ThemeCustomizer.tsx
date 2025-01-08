import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Paintbrush } from "lucide-react";

interface Theme {
  variant: "professional" | "modern" | "minimal";
  primary: string;
  background: string;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  appearance: "light" | "dark";
  radius: number;
  typography: {
    fontFamily: string;
    headingWeight: string;
  };
  branding: {
    companyName: string;
    logoUrl: string;
    style: string;
  };
}

export function ThemeCustomizer() {
  const [theme, setTheme] = useState<Theme>(JSON.parse(localStorage.getItem("theme") || "{}"));
  const { toast } = useToast();

  const handleThemeChange = (field: string, value: any) => {
    const newTheme = { ...theme, [field]: value };
    setTheme(newTheme);
    localStorage.setItem("theme", JSON.stringify(newTheme));

    // Apply theme changes
    document.documentElement.style.setProperty(`--${field}`, value);
  };

  const handleBrandColorChange = (colorType: keyof Theme["brandColors"], value: string) => {
    const newTheme = {
      ...theme,
      brandColors: { ...theme.brandColors, [colorType]: value }
    };
    setTheme(newTheme);
    localStorage.setItem("theme", JSON.stringify(newTheme));
    
    document.documentElement.style.setProperty(`--brand-${colorType}`, value);
  };

  const applyTheme = () => {
    try {
      fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
      }).then(() => {
        toast({
          title: "Theme Updated",
          description: "Your theme changes have been saved.",
        });
      });
    } catch (error) {
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
            <Label>Secondary Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={theme.brandColors.secondary}
                onChange={(e) => handleBrandColorChange("secondary", e.target.value)}
              />
              <Input
                value={theme.brandColors.secondary}
                onChange={(e) => handleBrandColorChange("secondary", e.target.value)}
                placeholder="Secondary color (HSL or HEX)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Accent Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={theme.brandColors.accent}
                onChange={(e) => handleBrandColorChange("accent", e.target.value)}
              />
              <Input
                value={theme.brandColors.accent}
                onChange={(e) => handleBrandColorChange("accent", e.target.value)}
                placeholder="Accent color (HSL or HEX)"
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

          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input
              value={theme.branding?.companyName}
              onChange={(e) =>
                setTheme({
                  ...theme,
                  branding: { ...theme.branding, companyName: e.target.value }
                })
              }
              placeholder="Your company name"
            />
          </div>

          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input
              value={theme.branding?.logoUrl}
              onChange={(e) =>
                setTheme({
                  ...theme,
                  branding: { ...theme.branding, logoUrl: e.target.value }
                })
              }
              placeholder="URL to your company logo"
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
