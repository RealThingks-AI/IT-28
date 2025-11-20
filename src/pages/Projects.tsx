import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal } from "lucide-react";

const projects = [
  {
    id: 1,
    name: "Website Redesign",
    status: "In Progress",
    progress: 65,
    team: 5,
    dueDate: "2024-02-15",
  },
  {
    id: 2,
    name: "Mobile App Development",
    status: "Planning",
    progress: 20,
    team: 8,
    dueDate: "2024-03-30",
  },
  {
    id: 3,
    name: "Marketing Campaign",
    status: "In Progress",
    progress: 80,
    team: 3,
    dueDate: "2024-01-20",
  },
  {
    id: 4,
    name: "API Integration",
    status: "Completed",
    progress: 100,
    team: 4,
    dueDate: "2024-01-05",
  },
];

export default function Projects() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Projects</h2>
          <p className="text-muted-foreground">Manage and track all your projects.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">{project.name}</CardTitle>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge
                    variant={
                      project.status === "Completed"
                        ? "default"
                        : project.status === "In Progress"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {project.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{project.team} team members</span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Progress</span>
                    <span className="text-sm text-muted-foreground">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">Due: {project.dueDate}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
