import { AssetTopBar } from "@/components/helpdesk/assets/AssetTopBar";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, TrendingDown, Wrench, FileText, Building2, TableProperties, CalendarDays, LayoutDashboard, FormInput, Mail } from "lucide-react";

export default function AssetSetup() {
  const navigate = useNavigate();
  const setupCards = [
    {
      title: "Fields Setup",
      description: "Sites, Locations, Categories, Departments, Makes",
      icon: Settings,
      onClick: () => navigate("/assets/setup/fields-setup"),
      category: "Core Configuration"
    },
    {
      title: "Depreciation Methods",
      description: "Straight-line, declining balance",
      icon: TrendingDown,
      onClick: () => navigate("/assets/depreciation"),
      category: "Core Configuration"
    },
    {
      title: "Company Information",
      description: "Organization details for reports and labels",
      icon: Building2,
      onClick: () => navigate("/settings"),
      category: "Core Configuration"
    },
    {
      title: "Table Options",
      description: "Configure visible columns in asset lists",
      icon: TableProperties,
      onClick: () => navigate("/assets/setup/fields-setup"),
      category: "Core Configuration"
    },
    {
      title: "Repairs & Maintenance",
      description: "Asset repair and maintenance tracking",
      icon: Wrench,
      onClick: () => navigate("/assets/repairs"),
      category: "Operations"
    },
    {
      title: "Audit Trail",
      description: "Asset history and compliance tracking",
      icon: FileText,
      onClick: () => navigate("/assets/audit"),
      category: "Operations"
    },
    {
      title: "Events",
      description: "Define custom event types for assets",
      icon: CalendarDays,
      onClick: () => navigate("/assets/setup/fields-setup"),
      category: "Operations"
    },
    {
      title: "Manage Dashboard",
      description: "Customize dashboard widgets and layout",
      icon: LayoutDashboard,
      onClick: () => navigate("/assets/dashboard"),
      category: "Customization"
    },
    {
      title: "Customize Forms",
      description: "Field visibility and required settings",
      icon: FormInput,
      onClick: () => navigate("/assets/setup/fields-setup"),
      category: "Customization"
    },
    {
      title: "Customize Emails",
      description: "Notification templates for alerts",
      icon: Mail,
      onClick: () => navigate("/settings"),
      category: "Customization"
    }
  ];

  const categories = Array.from(new Set(setupCards.map(card => card.category)));

  return (
    <div className="min-h-screen bg-background">
      <AssetTopBar />
      
      <div className="p-6 space-y-8">
        {categories.map(category => (
          <div key={category} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{category}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {setupCards
                .filter(card => card.category === category)
                .map((card, index) => (
                  <Card 
                    key={index} 
                    className="cursor-pointer hover:border-primary hover:shadow-md transition-all" 
                    onClick={card.onClick}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <card.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{card.title}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">{card.description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
