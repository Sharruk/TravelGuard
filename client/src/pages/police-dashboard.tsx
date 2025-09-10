import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  MapPin, 
  TrendingUp, 
  LogOut,
  Eye,
  Phone,
  Download,
  Filter,
  Bell,
  BarChart3,
  Gauge,
  X,
  Search
} from "lucide-react";
import PoliceMap from "@/components/police-map";
import { apiRequest } from "@/lib/queryClient";
import type { Tourist, User as UserType, Alert } from "@shared/schema";

export default function PoliceDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [touristFilter, setTouristFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [safetyScoreFilter, setSafetyScoreFilter] = useState("0");
  const [showCreateAlertModal, setShowCreateAlertModal] = useState(false);
  const [newAlertForm, setNewAlertForm] = useState({
    touristId: '',
    type: 'safety',
    severity: 'medium',
    location: '',
    description: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const user = JSON.parse(localStorage.getItem("user") || "{}") as UserType;

  useEffect(() => {
    if (!user.id || user.role !== "police") {
      setLocation("/");
    }
  }, [user.id, user.role, setLocation]);

  const { data: tourists = [] } = useQuery<Tourist[]>({
    queryKey: ["/api/police/tourists"],
    enabled: !!user.id,
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["/api/police/alerts"],
    enabled: !!user.id,
  });

  const { data: stats } = useQuery<{
    activeTourists: number;
    activeAlerts: number;
    highRiskZones: number;
    averageSafetyScore: string;
  }>({
    queryKey: ["/api/police/stats"],
    enabled: !!user.id,
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async ({ alertId, status }: { alertId: string; status: string }) => {
      return apiRequest("PUT", `/api/police/alert/${alertId}`, {
        status,
        respondedBy: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/police/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/police/stats"] });
      toast({
        title: "Success",
        description: "Alert status updated",
      });
    },
  });

  const createAlertMutation = useMutation({
    mutationFn: async (alertData: typeof newAlertForm) => {
      return apiRequest("POST", "/api/police/alerts", alertData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/police/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/police/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/police/tourists"] });
      toast({
        title: "Alert Created",
        description: "New alert has been successfully created.",
      });
      setShowCreateAlertModal(false);
      setNewAlertForm({
        touristId: '',
        type: 'safety',
        severity: 'medium',
        location: '',
        description: ''
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create alert. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("tourist");
    setLocation("/");
  };

  const handleCreateAlert = () => {
    if (!newAlertForm.touristId || !newAlertForm.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createAlertMutation.mutate(newAlertForm);
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch('/api/police/reports/download');
      if (!response.ok) throw new Error('Failed to download PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tourist_safety_report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "PDF report downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF report.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "safe":
        return "bg-success/10 text-success";
      case "caution":
        return "bg-warning/10 text-warning";
      case "alert":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted/10 text-muted-foreground";
    }
  };

  // Filter tourists based on search criteria
  const filteredTourists = tourists.filter((tourist: Tourist) => {
    const matchesName = tourist.touristId?.toLowerCase().includes(touristFilter.toLowerCase()) || 
                       `Tourist ${tourist.touristId || tourist.userId}`.toLowerCase().includes(touristFilter.toLowerCase());
    const matchesStatus = statusFilter === "all" || tourist.status === statusFilter;
    const matchesSafety = parseFloat(tourist.safetyScore || "0") >= parseFloat(safetyScoreFilter);
    return matchesName && matchesStatus && matchesSafety;
  });

  // Export function
  const exportTourists = (format: 'csv' | 'json') => {
    const exportData = filteredTourists.map(tourist => ({
      touristId: tourist.touristId,
      name: `Tourist ${tourist.touristId || tourist.userId}`,
      currentLocation: tourist.currentLocation,
      safetyScore: tourist.safetyScore,
      status: tourist.status,
      lastUpdate: tourist.lastUpdate ? new Date(tourist.lastUpdate).toLocaleString() : "Unknown"
    }));

    if (format === 'csv') {
      const headers = ['Tourist ID', 'Name', 'Current Location', 'Safety Score', 'Status', 'Last Updated'];
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => [
          row.touristId,
          row.name,
          row.currentLocation,
          row.safetyScore,
          row.status,
          row.lastUpdate
        ].join(','))
      ].join('\\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tourists-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tourists-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
    
    toast({
      title: "Export Complete",
      description: `${exportData.length} tourists exported as ${format.toUpperCase()}`,
    });
  };

  // View incident details
  const viewIncident = (alert: Alert) => {
    setSelectedAlert(alert);
    setShowIncidentModal(true);
  };

  // View alert on map
  const viewAlertOnMap = (alert: Alert) => {
    setSelectedAlert(alert);
    setShowMapModal(true);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "high":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-primary" />;
    }
  };

  if (!user.id || user.role !== "police") return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Police Dashboard Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">SafeTourism Police Dashboard</h1>
                <p className="text-sm text-muted-foreground">Goa Tourism Police - North District</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <span className="text-sm">System Online</span>
            </div>
            <div className="text-right">
              <p className="font-medium" data-testid="text-officer-name">{user.name}</p>
              <p className="text-sm text-muted-foreground" data-testid="text-officer-badge">
                Badge: {user.badge}
              </p>
            </div>
            <Button 
              onClick={handleLogout} 
              variant="ghost" 
              size="sm"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r overflow-y-auto">
          <nav className="p-4 space-y-2">
            {[
              { id: "overview", icon: Gauge, label: "Overview" },
              { id: "tourists", icon: Users, label: "Active Tourists" },
              { id: "alerts", icon: AlertTriangle, label: "Alerts & Incidents" },
              { id: "map", icon: MapPin, label: "Live Map" },
              { id: "reports", icon: BarChart3, label: "Reports" },
            ].map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                variant={activeTab === tab.id ? "default" : "ghost"}
                className="w-full justify-start"
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </Button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="p-6 space-y-6" data-testid="content-overview">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold" data-testid="stat-active-tourists">
                          {stats?.activeTourists || tourists.length}
                        </p>
                        <p className="text-sm text-muted-foreground">Active Tourists</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-warning" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold" data-testid="stat-active-alerts">
                          {stats?.activeAlerts || alerts.length}
                        </p>
                        <p className="text-sm text-muted-foreground">Active Alerts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-destructive" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold" data-testid="stat-high-risk-zones">
                          {stats?.highRiskZones || "3"}
                        </p>
                        <p className="text-sm text-muted-foreground">High Risk Zones</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                        <Shield className="h-6 w-6 text-success" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold" data-testid="stat-avg-safety-score">
                          {stats?.averageSafetyScore || "84.2"}
                        </p>
                        <p className="text-sm text-muted-foreground">Avg Safety Score</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-4">Recent Incidents</h3>
                    <div className="space-y-3">
                      {alerts.slice(0, 3).map((alert: Alert) => (
                        <div
                          key={alert.id}
                          className="flex items-start space-x-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                          data-testid={`incident-${alert.id}`}
                        >
                          {getSeverityIcon(alert.severity)}
                          <div className="flex-1">
                            <p className="font-medium">
                              {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} Alert
                            </p>
                            <p className="text-sm text-muted-foreground">{alert.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "Unknown"}
                            </p>
                          </div>
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={() => viewIncident(alert)}
                            data-testid={`button-view-incident-${alert.id}`}
                          >
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-4">System Status</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>GPS Tracking System</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-success rounded-full"></div>
                          <span className="text-sm text-success">Online</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Alert Notification System</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-success rounded-full"></div>
                          <span className="text-sm text-success">Online</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Blockchain Network</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-success rounded-full"></div>
                          <span className="text-sm text-success">Synced</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>AI/ML Safety Engine</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-warning rounded-full"></div>
                          <span className="text-sm text-warning">Processing</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Tourists Tab */}
          {activeTab === "tourists" && (
            <div className="p-6" data-testid="content-tourists">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Active Tourists</h2>
                <div className="flex space-x-2">
                  <div className="relative">
                    <Button 
                      variant="default" 
                      onClick={() => exportTourists('csv')}
                      data-testid="button-export-tourists"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </div>

              {/* Filter Controls */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Search Tourist</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Tourist ID or name..."
                          value={touristFilter}
                          onChange={(e) => setTouristFilter(e.target.value)}
                          className="pl-9"
                          data-testid="input-tourist-filter"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Status Filter</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger data-testid="select-status-filter">
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="safe">Safe</SelectItem>
                          <SelectItem value="caution">Caution</SelectItem>
                          <SelectItem value="alert">Alert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Min Safety Score</label>
                      <Select value={safetyScoreFilter} onValueChange={setSafetyScoreFilter}>
                        <SelectTrigger data-testid="select-safety-filter">
                          <SelectValue placeholder="Minimum score" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">All Scores</SelectItem>
                          <SelectItem value="50">50+</SelectItem>
                          <SelectItem value="70">70+</SelectItem>
                          <SelectItem value="80">80+</SelectItem>
                          <SelectItem value="90">90+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setTouristFilter("");
                          setStatusFilter("all");
                          setSafetyScoreFilter("0");
                        }}
                        data-testid="button-clear-filters"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    Showing {filteredTourists.length} of {tourists.length} tourists
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-4 font-medium">Tourist ID</th>
                          <th className="text-left p-4 font-medium">Name</th>
                          <th className="text-left p-4 font-medium">Current Location</th>
                          <th className="text-left p-4 font-medium">Safety Score</th>
                          <th className="text-left p-4 font-medium">Status</th>
                          <th className="text-left p-4 font-medium">Last Updated</th>
                          <th className="text-left p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredTourists.map((tourist: Tourist) => (
                          <tr key={tourist.id} className="hover:bg-muted/50" data-testid={`tourist-row-${tourist.id}`}>
                            <td className="p-4 font-mono text-sm" data-testid={`tourist-id-${tourist.id}`}>
                              {tourist.touristId}
                            </td>
                            <td className="p-4" data-testid={`tourist-name-${tourist.id}`}>
                              Tourist {tourist.touristId || tourist.userId}
                            </td>
                            <td className="p-4" data-testid={`tourist-location-${tourist.id}`}>
                              {tourist.currentLocation}
                            </td>
                            <td className="p-4">
                              <Badge className={getStatusColor("safe")} data-testid={`tourist-score-${tourist.id}`}>
                                {tourist.safetyScore}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Badge className={getStatusColor(tourist.status || "safe")} data-testid={`tourist-status-${tourist.id}`}>
                                {tourist.status ? tourist.status.charAt(0).toUpperCase() + tourist.status.slice(1) : "Safe"}
                              </Badge>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {tourist.lastUpdate ? new Date(tourist.lastUpdate).toLocaleString() : "Unknown"}
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <Button variant="link" size="sm" data-testid={`button-view-tourist-${tourist.id}`}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button variant="link" size="sm" data-testid={`button-contact-tourist-${tourist.id}`}>
                                  <Phone className="h-4 w-4 mr-1" />
                                  Contact
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === "alerts" && (
            <div className="p-6" data-testid="content-alerts">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Alerts & Incidents</h2>
                <div className="flex space-x-2">
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowCreateAlertModal(true)}
                    data-testid="button-create-alert"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Create Alert
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {alerts.map((alert: Alert) => (
                  <Card key={alert.id} data-testid={`alert-card-${alert.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          {getSeverityIcon(alert.severity)}
                          <div>
                            <h3 className="font-semibold text-destructive">
                              {alert.type.toUpperCase()} ALERT - {alert.severity.toUpperCase()} PRIORITY
                            </h3>
                            <p className="text-sm">Tourist ID: {alert.touristId}</p>
                            <p className="text-sm text-muted-foreground">Location: {alert.location || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">
                              Triggered: {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "Unknown"}
                            </p>
                            <div className="flex space-x-2 mt-2">
                              <Badge className={getStatusColor(alert.status || "unknown")} data-testid={`alert-status-${alert.id}`}>
                                {(alert.status || "unknown").toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => viewAlertOnMap(alert)}
                            data-testid={`button-view-map-${alert.id}`}
                          >
                            View Map
                          </Button>
                          {alert.status === "active" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => resolveAlertMutation.mutate({ alertId: alert.id, status: "resolved" })}
                              disabled={resolveAlertMutation.isPending}
                              data-testid={`button-resolve-${alert.id}`}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Map Tab */}
          {activeTab === "map" && (
            <div className="p-6 space-y-4" data-testid="content-map">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Live Map View</h2>
                <div className="flex space-x-2">
                  <Button variant="default" data-testid="button-refresh-map">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
              
              <Card>
                <CardContent className="p-4">
                  <div className="h-96">
                    <PoliceMap tourists={tourists} alerts={alerts} />
                  </div>
                </CardContent>
              </Card>

              {/* Map Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Map Legend</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                        <span>Tourist - Safe</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-warning rounded-full"></div>
                        <span>Tourist - Caution</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-destructive rounded-full"></div>
                        <span>Tourist - Alert</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
                        <span>Police Station</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Zone Statistics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Safe Zones</span>
                        <span className="font-medium">
                          {tourists.filter((t: Tourist) => t.status === 'safe').length} tourists
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Caution Zones</span>
                        <span className="font-medium">
                          {tourists.filter((t: Tourist) => t.status === 'caution').length} tourists
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>High Risk Zones</span>
                        <span className="font-medium text-destructive">
                          {tourists.filter((t: Tourist) => t.status === 'alert').length} tourists
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button className="w-full" variant="destructive" size="sm" data-testid="button-broadcast-alert">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Broadcast Alert
                      </Button>
                      <Button className="w-full" variant="secondary" size="sm" data-testid="button-create-geofence">
                        <MapPin className="h-4 w-4 mr-2" />
                        Create Geo-fence
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === "reports" && (
            <div className="p-6" data-testid="content-reports">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Reports & Analytics</h2>
                <div className="flex space-x-2">
                  <Button 
                    variant="default" 
                    onClick={handleDownloadPDF}
                    data-testid="button-export-pdf"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Safety Score Trends */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-4">Safety Score Trends</h3>
                    <div className="h-64 bg-muted rounded flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                        <p>Safety Score Chart</p>
                        <p className="text-sm">Average score trending upward (+2.3%)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Response Time Analytics */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-4">Response Time Analytics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-success">3.2</p>
                        <p className="text-sm text-muted-foreground">Avg Response (min)</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">98.5%</p>
                        <p className="text-sm text-muted-foreground">SLA Compliance</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Incident Details Modal */}
      <Dialog open={showIncidentModal} onOpenChange={setShowIncidentModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Incident Details
            </DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Alert ID</label>
                  <p className="font-mono text-sm">{selectedAlert.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tourist ID</label>
                  <p className="font-mono text-sm">{selectedAlert.touristId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Alert Type</label>
                  <p className="capitalize">{selectedAlert.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Severity</label>
                  <Badge className={selectedAlert.severity === 'critical' ? 'bg-destructive' : 'bg-warning'}>
                    {selectedAlert.severity.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge className={selectedAlert.status === 'resolved' ? 'bg-success' : 'bg-destructive'}>
                    {(selectedAlert.status || 'active').toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Triggered</label>
                  <p className="text-sm">
                    {selectedAlert.createdAt ? new Date(selectedAlert.createdAt).toLocaleString() : "Unknown"}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Location</label>
                <p>{selectedAlert.location || "Unknown"}</p>
                {selectedAlert.lat && selectedAlert.lng && (
                  <p className="text-sm text-muted-foreground">
                    Coordinates: {selectedAlert.lat}, {selectedAlert.lng}
                  </p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p>{selectedAlert.description || "No additional details available"}</p>
              </div>
              
              {selectedAlert.respondedBy && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Responded By</label>
                  <p>Officer ID: {selectedAlert.respondedBy}</p>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => viewAlertOnMap(selectedAlert)}
                  data-testid="button-modal-view-map"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  View on Map
                </Button>
                {selectedAlert.status === "active" && (
                  <Button 
                    variant="outline"
                    onClick={() => resolveAlertMutation.mutate({ alertId: selectedAlert.id, status: "resolved" })}
                    disabled={resolveAlertMutation.isPending}
                    data-testid="button-modal-resolve"
                  >
                    Resolve Alert
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  onClick={() => setShowIncidentModal(false)}
                  data-testid="button-modal-close"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Map Modal */}
      <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Alert Location Map
            </DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{selectedAlert.type.toUpperCase()} Alert</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAlert.location || "Unknown location"}
                  </p>
                </div>
                <Badge className={selectedAlert.severity === 'critical' ? 'bg-destructive' : 'bg-warning'}>
                  {selectedAlert.severity}
                </Badge>
              </div>
              
              <div className="h-96 rounded-lg overflow-hidden border">
                <PoliceMap 
                  tourists={tourists} 
                  alerts={[selectedAlert]} 
                  centerOn={selectedAlert.lat && selectedAlert.lng ? {
                    lat: parseFloat(selectedAlert.lat),
                    lng: parseFloat(selectedAlert.lng)
                  } : undefined}
                  zoom={15}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowMapModal(false)}
                  data-testid="button-map-modal-close"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Alert Modal */}
      <Dialog open={showCreateAlertModal} onOpenChange={setShowCreateAlertModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Create New Alert
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tourist ID</label>
              <Select 
                value={newAlertForm.touristId} 
                onValueChange={(value) => setNewAlertForm({...newAlertForm, touristId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tourist" />
                </SelectTrigger>
                <SelectContent>
                  {tourists.map((tourist) => (
                    <SelectItem key={tourist.id} value={tourist.id}>
                      {tourist.touristId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Alert Type</label>
              <Select 
                value={newAlertForm.type} 
                onValueChange={(value) => setNewAlertForm({...newAlertForm, type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="weather">Weather</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Severity</label>
              <Select 
                value={newAlertForm.severity} 
                onValueChange={(value) => setNewAlertForm({...newAlertForm, severity: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Location (Optional)</label>
              <Input 
                value={newAlertForm.location}
                onChange={(e) => setNewAlertForm({...newAlertForm, location: e.target.value})}
                placeholder="Alert location"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input 
                value={newAlertForm.description}
                onChange={(e) => setNewAlertForm({...newAlertForm, description: e.target.value})}
                placeholder="Describe the alert"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateAlertModal(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCreateAlert}
                disabled={createAlertMutation.isPending}
              >
                {createAlertMutation.isPending ? 'Creating...' : 'Create Alert'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
