import { Navigate } from "react-router-dom";

// This file is kept for backwards compatibility
// All ticket functionality has been split into separate pages:
// - /tickets (dashboard.tsx) - Dashboard with overview stats
// - /tickets/list (list.tsx) - All tickets list
// - /tickets/problems (problems.tsx) - Problem management
// - /tickets/settings (settings.tsx) - Ticket configuration

export default function TicketsModule() {
  return <Navigate to="/tickets" replace />;
}
