import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MoreHorizontal } from "lucide-react";

const team = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Product Manager",
    email: "sarah.j@company.com",
    status: "active",
    initials: "SJ",
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Lead Developer",
    email: "michael.c@company.com",
    status: "active",
    initials: "MC",
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    role: "UI/UX Designer",
    email: "emily.r@company.com",
    status: "active",
    initials: "ER",
  },
  {
    id: 4,
    name: "David Kim",
    role: "Backend Developer",
    email: "david.k@company.com",
    status: "away",
    initials: "DK",
  },
  {
    id: 5,
    name: "Lisa Anderson",
    role: "Marketing Lead",
    email: "lisa.a@company.com",
    status: "active",
    initials: "LA",
  },
  {
    id: 6,
    name: "James Wilson",
    role: "Data Analyst",
    email: "james.w@company.com",
    status: "active",
    initials: "JW",
  },
];

export default function Team() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Team</h2>
          <p className="text-muted-foreground">Manage your team members and their roles.</p>
        </div>
        <Button>Invite Member</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {team.map((member) => (
          <Card key={member.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {member.email}
                </div>
                <Badge variant={member.status === "active" ? "default" : "secondary"}>
                  {member.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
