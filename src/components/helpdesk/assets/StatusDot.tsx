type StatusType = "active" | "inactive" | "pending" | "in_progress" | "completed" | "cancelled" | "expired" | "expiring";

const DOT_COLORS: Record<string, string> = {
  active: "bg-green-500",
  inactive: "bg-red-500",
  pending: "bg-yellow-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
  expired: "bg-red-500",
  expiring: "bg-yellow-500",
};

export const StatusDot = ({ status, label }: { status: StatusType; label: string }) => {
  const dotColor = DOT_COLORS[status] || "bg-muted-foreground";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
};
