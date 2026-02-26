import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Key, AlertTriangle, XCircle, Users, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", AUD: "A$", CAD: "C$",
};

const ITEMS_PER_PAGE = 50;

const LicensesList = ({ embedded = false }: { embedded?: boolean }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { settings } = useSystemSettings();
  const currencySymbol = CURRENCY_SYMBOLS[settings.currency] || settings.currency;

  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ["itam-licenses-list", searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_licenses")
        .select("*, itam_vendors(name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const filteredLicenses = licenses.filter((license) =>
    searchTerm
      ? license.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        license.itam_vendors?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-orange-600";
    return "text-green-600";
  };

  const getExpiryInfo = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const daysUntil = differenceInDays(expiry, new Date());
    if (isPast(expiry)) return { status: "expired" as const, days: Math.abs(daysUntil) };
    if (daysUntil <= 30) return { status: "expiring" as const, days: daysUntil };
    return { status: "active" as const, days: daysUntil };
  };

  // Stats
  const totalLicenses = licenses.length;
  const expiringSoon = licenses.filter(l => {
    const info = getExpiryInfo(l.expiry_date);
    return info?.status === "expiring";
  }).length;
  const expired = licenses.filter(l => {
    const info = getExpiryInfo(l.expiry_date);
    return info?.status === "expired";
  }).length;
  const totalSeatsUsed = licenses.reduce((acc, l) => acc + (l.seats_allocated || 0), 0);
  const totalSeatsTotal = licenses.reduce((acc, l) => acc + (l.seats_total || 1), 0);

  // Pagination
  const totalPages = Math.ceil(filteredLicenses.length / ITEMS_PER_PAGE);
  const paginatedLicenses = useMemo(() => 
    filteredLicenses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredLicenses, currentPage]
  );

  // Reset page on search change
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <div className={embedded ? "" : "min-h-screen bg-background"}>
      <div className={embedded ? "space-y-4" : "p-6 space-y-4"}>
        {!embedded && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BackButton />
              <div>
                <h1 className="text-2xl font-bold">License Management</h1>
                <p className="text-xs text-muted-foreground">
                  {filteredLicenses.length} licenses
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate("/assets/licenses/add-license")}>
              <Plus className="h-4 w-4 mr-2" />
              Add License
            </Button>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalLicenses}</p>
                <p className="text-xs text-muted-foreground">Total Licenses</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold">{expiringSoon}</p>
                <p className="text-xs text-muted-foreground">Expiring Soon</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <XCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold">{expired}</p>
                <p className="text-xs text-muted-foreground">Expired</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalSeatsUsed}/{totalSeatsTotal}</p>
                <p className="text-xs text-muted-foreground">Seats Used</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search licenses or vendors..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-8"
            />
          </div>
          {embedded && (
            <div className="ml-auto">
              <Button size="sm" onClick={() => navigate("/assets/licenses/add-license")}>
                <Plus className="h-4 w-4 mr-2" />
                Add License
              </Button>
            </div>
          )}
        </div>

        {/* Licenses Table */}
        <Card>
          <CardContent className="pt-4">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">License Name</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Vendor</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Type</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Seats</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Utilization</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Expiry</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-2" />
                        <p className="text-sm text-muted-foreground">Loading licenses...</p>
                      </div>
                    </TableCell>
                </TableRow>
              ) : filteredLicenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <Key className="h-8 w-8 text-muted-foreground mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">No licenses found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLicenses.map((license) => {
                  const seatsTotal = license.seats_total || 1;
                  const seatsAllocated = license.seats_allocated || 0;
                  const utilization = (seatsAllocated / seatsTotal) * 100;
                  const expiryInfo = getExpiryInfo(license.expiry_date);
                  const rowClass = expiryInfo?.status === "expired"
                    ? "bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30"
                    : expiryInfo?.status === "expiring"
                    ? "bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30"
                    : "hover:bg-muted/50";
                  return (
                    <TableRow
                      key={license.id}
                      className={`cursor-pointer transition-colors ${rowClass}`}
                      onClick={() => navigate(`/assets/licenses/detail/${license.id}`)}
                    >
                      <TableCell className="font-medium">{license.name}</TableCell>
                      <TableCell className="text-sm">
                        {license.itam_vendors?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {license.license_type || "License"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {seatsAllocated} / {seatsTotal}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className={`text-xs font-medium ${getUtilizationColor(utilization)}`}>
                            {utilization.toFixed(0)}%
                          </div>
                          <Progress value={utilization} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {license.expiry_date ? (
                          <div className="space-y-0.5">
                            <span className={
                              expiryInfo?.status === "expired" ? "text-destructive font-medium" :
                              expiryInfo?.status === "expiring" ? "text-amber-600 dark:text-amber-400 font-medium" :
                              "text-muted-foreground"
                            }>
                              {format(new Date(license.expiry_date), "MMM d, yyyy")}
                            </span>
                            {expiryInfo?.status === "expired" && (
                              <Badge variant="destructive" className="text-[10px] h-4 ml-1">Expired</Badge>
                            )}
                            {expiryInfo?.status === "expiring" && (
                              <Badge variant="outline" className="text-[10px] h-4 ml-1 border-amber-500 text-amber-600">{expiryInfo.days}d left</Badge>
                            )}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {license.cost ? `${currencySymbol}${license.cost.toLocaleString()}` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 px-1">
              <p className="text-xs text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredLicenses.length)} of {filteredLicenses.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LicensesList;
