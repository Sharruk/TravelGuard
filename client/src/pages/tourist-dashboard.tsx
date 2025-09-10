import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Home, Map, User, LogOut, MapPin, Phone, AlertTriangle, Info, ExternalLink, History, Plus, Edit, X } from "lucide-react";
import TouristMap from "@/components/tourist-map";
import PanicButton from "@/components/panic-button";
import type { Tourist, User as UserType, Alert } from "@shared/schema";

const itinerarySchema = z.object({
  place: z.string().min(1, "Place is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  notes: z.string().optional(),
});

const emergencyContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  relation: z.string().min(1, "Relationship is required"),
});

export default function TouristDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [locationSharing, setLocationSharing] = useState(true);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [editingContact, setEditingContact] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const user = JSON.parse(localStorage.getItem("user") || "{}") as UserType;
  const storedTourist = JSON.parse(localStorage.getItem("tourist") || "{}") as Tourist;

  useEffect(() => {
    if (!user.id) {
      setLocation("/");
    }
  }, [user.id, setLocation]);

  const { data: tourist } = useQuery<Tourist>({
    queryKey: ["/api/tourist/profile", user.id],
    enabled: !!user.id,
  });

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ["/api/tourist/alerts", storedTourist?.touristId],
    enabled: !!storedTourist?.touristId,
  });

  const currentTourist = tourist || storedTourist || {} as Tourist;

  // Form instances
  const itineraryForm = useForm<z.infer<typeof itinerarySchema>>({
    resolver: zodResolver(itinerarySchema),
    defaultValues: {
      place: "",
      date: "",
      time: "",
      notes: "",
    },
  });

  const contactForm = useForm<z.infer<typeof emergencyContactSchema>>({
    resolver: zodResolver(emergencyContactSchema),
    defaultValues: {
      name: "",
      phone: "",
      relation: "",
    },
  });

  // Mutations
  const addItineraryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof itinerarySchema>) => {
      return apiRequest(`/api/tourist/itinerary/${currentTourist.id}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tourist/profile", user.id] });
      toast({ title: "Success", description: "Itinerary item added successfully" });
      setShowItineraryModal(false);
      itineraryForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add itinerary item", variant: "destructive" });
    },
  });

  const updateContactsMutation = useMutation({
    mutationFn: async (contacts: Array<{ name: string; phone: string; relation: string }>) => {
      return apiRequest(`/api/tourist/contacts/${currentTourist.id}`, {
        method: "PUT",
        body: JSON.stringify({ emergencyContacts: contacts }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tourist/profile", user.id] });
      toast({ title: "Success", description: "Emergency contacts updated successfully" });
      setShowContactsModal(false);
      setEditingContact(null);
      contactForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update emergency contacts", variant: "destructive" });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("tourist");
    setLocation("/");
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-destructive/10 border-destructive/20 text-destructive";
      case "high":
        return "bg-warning/10 border-warning/20 text-warning";
      default:
        return "bg-muted border-muted/20";
    }
  };

  if (!user.id) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Navigation Header */}
      <header className="bg-primary text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6" />
            <div>
              <h1 className="font-bold">SafeTourism</h1>
              <p className="text-xs opacity-90" data-testid="text-location">
                {currentTourist?.currentLocation || "Goa, India"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-xs opacity-90">Safety Score</p>
              <p className="font-bold text-lg" data-testid="text-safety-score">
                {currentTourist?.safetyScore || "87"}
              </p>
            </div>
            <Button 
              onClick={handleLogout} 
              variant="ghost" 
              size="sm"
              className="p-2 hover:bg-blue-600"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Quick Actions Bar */}
      <div className="bg-card border-b p-4">
        <div className="flex justify-between items-center gap-4">
          {/* Emergency Panic Button */}
          <PanicButton touristId={currentTourist?.touristId} />
          
          {/* Location Sharing Toggle */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Location Sharing</label>
            <Switch
              checked={locationSharing}
              onCheckedChange={setLocationSharing}
              data-testid="switch-location-sharing"
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className="bg-card border-b">
        <div className="flex">
          {[
            { id: "dashboard", icon: Home, label: "Dashboard" },
            { id: "map", icon: Map, label: "Map" },
            { id: "alerts", icon: History, label: "Alerts" },
            { id: "profile", icon: User, label: "Profile" },
          ].map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              variant="ghost"
              className={`flex-1 py-3 px-4 border-b-2 ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4 mr-1" />
              {tab.label}
            </Button>
          ))}
        </div>
      </nav>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="p-4 space-y-6" data-testid="content-dashboard">
          {/* Safety Status Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Safety Status</h2>
                <div className="w-3 h-3 bg-success rounded-full"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-success" data-testid="text-safety-score-card">
                    {currentTourist?.safetyScore || "87"}
                  </p>
                  <p className="text-sm text-muted-foreground">Safety Score</p>
                </div>
                <div className="text-center">
                  <Badge className={getStatusColor(currentTourist?.status || "safe")} data-testid="badge-zone-status">
                    {(currentTourist?.status || "safe").charAt(0).toUpperCase() + (currentTourist?.status || "safe").slice(1)}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">Current Zone</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Location Card */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Current Location</h3>
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium" data-testid="text-current-location">
                    {currentTourist?.currentLocation || "Calangute Beach, Goa"}
                  </p>
                  <p className="text-sm text-muted-foreground">Last updated: 2 minutes ago</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Recent Alerts</h3>
              <div className="space-y-3">
                {alerts?.length ? (
                  alerts.slice(0, 3).map((alert: Alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg ${getSeverityColor(alert.severity)}`}
                      data-testid={`alert-${alert.id}`}
                    >
                      <AlertTriangle className="h-5 w-5 mt-1" />
                      <div>
                        <p className="font-medium">{alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} Alert</p>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "Unknown"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
                    <Info className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <p className="font-medium">No recent alerts</p>
                      <p className="text-sm text-muted-foreground">All systems are operating normally</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contacts */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Emergency Contacts</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Tourist Helpline</span>
                  <Button variant="link" className="p-0 h-auto" data-testid="link-tourist-helpline">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    1363
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <span>Police Emergency</span>
                  <Button variant="link" className="p-0 h-auto" data-testid="link-police-emergency">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    100
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <span>Medical Emergency</span>
                  <Button variant="link" className="p-0 h-auto" data-testid="link-medical-emergency">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    108
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map Tab */}
      {activeTab === "map" && (
        <div className="p-4 space-y-4" data-testid="content-map">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Live Location Map</h3>
              <div className="h-96">
                <TouristMap tourist={currentTourist} />
              </div>
            </CardContent>
          </Card>
          
          {/* Map Legend */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Map Legend</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-primary rounded-full"></div>
                  <span>Your Location</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-success rounded-full"></div>
                  <span>Safe Zone</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-warning rounded-full"></div>
                  <span>Caution Zone</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-destructive rounded-full"></div>
                  <span>High Risk Zone</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts History Tab */}
      {activeTab === "alerts" && (
        <div className="p-4 space-y-6" data-testid="content-alerts">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Alert History</h3>
                <Badge variant="outline">{alerts?.length || 0} total</Badge>
              </div>
              
              <div className="space-y-3">
                {alerts?.length ? (
                  alerts.map((alert: Alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-start space-x-3 p-4 rounded-lg border ${
                        alert.severity === 'critical' 
                          ? 'bg-destructive/5 border-destructive/20' 
                          : 'bg-muted/50 border-muted'
                      }`}
                      data-testid={`alert-history-${alert.id}`}
                    >
                      <AlertTriangle className={`h-5 w-5 mt-1 ${
                        alert.severity === 'critical' ? 'text-destructive' : 'text-warning'
                      }`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} Alert
                            </p>
                            <p className="text-sm text-muted-foreground">{alert.description}</p>
                            <p className="text-sm text-muted-foreground">
                              Location: {alert.location || "Unknown"}
                            </p>
                          </div>
                          <Badge 
                            className={alert.status === 'resolved' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}
                          >
                            {alert.status || 'active'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground">
                            {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "Unknown"}
                          </p>
                          <p className="text-xs font-medium text-primary">
                            Priority: {alert.severity}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No alerts in history</p>
                    <p className="text-sm">You haven't triggered any emergency alerts</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alert Statistics */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Alert Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {alerts?.filter(a => a.status === 'resolved').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-warning">
                    {alerts?.filter(a => a.status === 'active').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="p-4 space-y-6" data-testid="content-profile">
          {/* Digital Tourist ID */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Digital Tourist ID</h3>
              <div className="bg-gradient-to-r from-primary to-blue-600 text-primary-foreground p-4 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm opacity-90">Tourist ID</p>
                    <p className="font-mono text-lg" data-testid="text-tourist-id">
                      {currentTourist?.touristId || "TID-2024-001523"}
                    </p>
                  </div>
                  <div className="text-2xl">🏷️</div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="opacity-90">Name</p>
                    <p className="font-medium" data-testid="text-user-name">{user.name}</p>
                  </div>
                  <div>
                    <p className="opacity-90">Nationality</p>
                    <p className="font-medium" data-testid="text-nationality">{user.nationality || "Indian"}</p>
                  </div>
                  <div>
                    <p className="opacity-90">Valid Until</p>
                    <p className="font-medium" data-testid="text-valid-until">
                      {currentTourist?.validUntil 
                        ? new Date(currentTourist.validUntil).toLocaleDateString()
                        : "Dec 30, 2024"
                      }
                    </p>
                  </div>
                  <div>
                    <p className="opacity-90">Status</p>
                    <p className="font-medium text-green-200">Active</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trip Itinerary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Trip Itinerary</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowItineraryModal(true)}
                  data-testid="button-add-itinerary"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-3">
                {currentTourist?.itinerary?.length ? (
                  currentTourist.itinerary.map((item, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium" data-testid={`itinerary-place-${index}`}>{item.place}</p>
                        <p className="text-sm text-muted-foreground" data-testid={`itinerary-time-${index}`}>
                          {item.date}, {item.time}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No itinerary items added yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contacts */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Emergency Contacts</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowContactsModal(true)}
                  data-testid="button-edit-contacts"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
              <div className="space-y-3">
                {currentTourist?.emergencyContacts?.length ? (
                  currentTourist.emergencyContacts.map((contact, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium" data-testid={`contact-name-${index}`}>{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.relation}</p>
                      </div>
                      <Button variant="link" className="p-0 h-auto" data-testid={`contact-phone-${index}`}>
                        <Phone className="h-4 w-4 mr-1" />
                        {contact.phone}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No emergency contacts added yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Settings</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Location Sharing</span>
                  <Switch checked={locationSharing} onCheckedChange={setLocationSharing} />
                </div>
                <div className="flex justify-between items-center">
                  <span>Push Notifications</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex justify-between items-center">
                  <span>Emergency Auto-Share</span>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Itinerary Modal */}
      <Dialog open={showItineraryModal} onOpenChange={setShowItineraryModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Itinerary Item</DialogTitle>
          </DialogHeader>
          <Form {...itineraryForm}>
            <form onSubmit={itineraryForm.handleSubmit((data) => addItineraryMutation.mutate(data))} className="space-y-4">
              <FormField
                control={itineraryForm.control}
                name="place"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Place</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter destination" {...field} data-testid="input-itinerary-place" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itineraryForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-itinerary-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itineraryForm.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} data-testid="input-itinerary-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itineraryForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} data-testid="input-itinerary-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={addItineraryMutation.isPending}
                  data-testid="button-save-itinerary"
                >
                  {addItineraryMutation.isPending ? "Adding..." : "Add Item"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowItineraryModal(false)}
                  data-testid="button-cancel-itinerary"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Emergency Contacts Modal */}
      <Dialog open={showContactsModal} onOpenChange={setShowContactsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Emergency Contacts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Existing Contacts */}
            {currentTourist?.emergencyContacts?.map((contact, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-muted-foreground">{contact.relation}</p>
                  <p className="text-sm">{contact.phone}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const contacts = [...(currentTourist?.emergencyContacts || [])];
                    contacts.splice(index, 1);
                    updateContactsMutation.mutate(contacts);
                  }}
                  data-testid={`button-remove-contact-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* Add New Contact Form */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Add New Contact</h4>
              <Form {...contactForm}>
                <form onSubmit={contactForm.handleSubmit((data) => {
                  const existingContacts = currentTourist?.emergencyContacts || [];
                  const newContacts = [...existingContacts, data];
                  updateContactsMutation.mutate(newContacts);
                })} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={contactForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Contact name" {...field} data-testid="input-contact-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contactForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+91 12345 67890" {...field} data-testid="input-contact-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={contactForm.control}
                    name="relation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-contact-relation">
                              <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="family">Family</SelectItem>
                            <SelectItem value="friend">Friend</SelectItem>
                            <SelectItem value="colleague">Colleague</SelectItem>
                            <SelectItem value="emergency">Emergency Service</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={updateContactsMutation.isPending}
                      data-testid="button-add-contact"
                    >
                      {updateContactsMutation.isPending ? "Adding..." : "Add Contact"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowContactsModal(false)}
                data-testid="button-close-contacts"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
