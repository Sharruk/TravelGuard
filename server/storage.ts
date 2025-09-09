import { type User, type InsertUser, type Tourist, type InsertTourist, type GeoZone, type InsertGeoZone, type Alert, type InsertAlert } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Tourists
  getTourist(id: string): Promise<Tourist | undefined>;
  getTouristByUserId(userId: string): Promise<Tourist | undefined>;
  getTouristByTouristId(touristId: string): Promise<Tourist | undefined>;
  createTourist(tourist: InsertTourist): Promise<Tourist>;
  updateTourist(id: string, updates: Partial<Tourist>): Promise<Tourist | undefined>;
  getAllTourists(): Promise<Tourist[]>;
  
  // Geo Zones
  getAllGeoZones(): Promise<GeoZone[]>;
  createGeoZone(zone: InsertGeoZone): Promise<GeoZone>;
  
  // Alerts
  getAlert(id: string): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | undefined>;
  getActiveAlerts(): Promise<Alert[]>;
  getAlertsByTourist(touristId: string): Promise<Alert[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tourists: Map<string, Tourist>;
  private geoZones: Map<string, GeoZone>;
  private alerts: Map<string, Alert>;

  constructor() {
    this.users = new Map();
    this.tourists = new Map();
    this.geoZones = new Map();
    this.alerts = new Map();
    
    // Initialize with some demo data
    this.initializeData();
  }

  private async initializeData() {
    // Create demo tourist user
    const touristUser: User = {
      id: "user-1",
      username: "priya.sharma",
      password: "password123",
      role: "tourist",
      name: "Priya Sharma",
      nationality: "Indian",
      badge: null,
      createdAt: new Date(),
    };
    this.users.set(touristUser.id, touristUser);

    // Create demo police user
    const policeUser: User = {
      id: "user-2",
      username: "raj.desai",
      password: "password123",
      role: "police",
      name: "Officer Raj Desai",
      nationality: "Indian",
      badge: "GP-1234",
      createdAt: new Date(),
    };
    this.users.set(policeUser.id, policeUser);

    // Create demo tourist
    const tourist: Tourist = {
      id: "tourist-1",
      userId: "user-1",
      touristId: "TID-2024-001523",
      safetyScore: "87.00",
      currentLocation: "Calangute Beach, Goa",
      lastKnownLat: "15.5527",
      lastKnownLng: "73.7547",
      locationSharing: true,
      status: "safe",
      validUntil: new Date("2024-12-30"),
      emergencyContacts: [
        { name: "Rahul Sharma", phone: "+91 98765-43210", relation: "Brother" },
        { name: "Maya Sharma", phone: "+91 98765-43211", relation: "Mother" }
      ],
      itinerary: [
        { place: "Calangute Beach", date: "2024-12-26", time: "9:00 AM - 2:00 PM" },
        { place: "Old Goa Churches", date: "2024-12-27", time: "10:00 AM - 4:00 PM" },
        { place: "Spice Plantation Tour", date: "2024-12-28", time: "8:00 AM - 6:00 PM" }
      ],
      lastUpdate: new Date(),
    };
    this.tourists.set(tourist.id, tourist);

    // Create additional demo tourists
    const tourist2: Tourist = {
      id: "tourist-2",
      userId: randomUUID(),
      touristId: "TID-2024-001524",
      safetyScore: "73.00",
      currentLocation: "Anjuna Beach",
      lastKnownLat: "15.5937",
      lastKnownLng: "73.7370",
      locationSharing: true,
      status: "caution",
      validUntil: new Date("2024-12-30"),
      emergencyContacts: [],
      itinerary: [],
      lastUpdate: new Date(),
    };
    this.tourists.set(tourist2.id, tourist2);

    const tourist3: Tourist = {
      id: "tourist-3",
      userId: randomUUID(),
      touristId: "TID-2024-001525",
      safetyScore: "91.00",
      currentLocation: "Old Goa",
      lastKnownLat: "15.5007",
      lastKnownLng: "73.9119",
      locationSharing: true,
      status: "safe",
      validUntil: new Date("2024-12-30"),
      emergencyContacts: [],
      itinerary: [],
      lastUpdate: new Date(),
    };
    this.tourists.set(tourist3.id, tourist3);

    // Create demo geo zones
    const restrictedZone: GeoZone = {
      id: "zone-1",
      name: "Restricted Military Area",
      type: "restricted",
      coordinates: [
        { lat: 15.4800, lng: 73.8200 },
        { lat: 15.4850, lng: 73.8200 },
        { lat: 15.4850, lng: 73.8300 },
        { lat: 15.4800, lng: 73.8300 }
      ],
      description: "Military restricted area - entry prohibited",
      createdAt: new Date(),
    };
    this.geoZones.set(restrictedZone.id, restrictedZone);

    const cautionZone: GeoZone = {
      id: "zone-2",
      name: "Unsafe Beach Area",
      type: "caution",
      coordinates: [
        { lat: 15.5600, lng: 73.7400 },
        { lat: 15.5650, lng: 73.7400 },
        { lat: 15.5650, lng: 73.7500 },
        { lat: 15.5600, lng: 73.7500 }
      ],
      description: "High tide and strong currents - exercise caution",
      createdAt: new Date(),
    };
    this.geoZones.set(cautionZone.id, cautionZone);

    // Create demo alerts
    const panicAlert: Alert = {
      id: "alert-1",
      touristId: "tourist-1",
      type: "panic",
      severity: "critical",
      status: "active",
      location: "Baga Beach, Near Tito's Club",
      lat: "15.5527",
      lng: "73.7547",
      description: "Panic button triggered",
      respondedBy: null,
      createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      resolvedAt: null,
    };
    this.alerts.set(panicAlert.id, panicAlert);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      nationality: insertUser.nationality || null,
      badge: insertUser.badge || null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getTourist(id: string): Promise<Tourist | undefined> {
    return this.tourists.get(id);
  }

  async getTouristByUserId(userId: string): Promise<Tourist | undefined> {
    return Array.from(this.tourists.values()).find(tourist => tourist.userId === userId);
  }

  async getTouristByTouristId(touristId: string): Promise<Tourist | undefined> {
    return Array.from(this.tourists.values()).find(tourist => tourist.touristId === touristId);
  }

  async createTourist(insertTourist: InsertTourist): Promise<Tourist> {
    const id = randomUUID();
    const tourist: Tourist = { 
      ...insertTourist, 
      id,
      safetyScore: insertTourist.safetyScore || "85.00",
      currentLocation: insertTourist.currentLocation || null,
      lastKnownLat: insertTourist.lastKnownLat || null,
      lastKnownLng: insertTourist.lastKnownLng || null,
      locationSharing: insertTourist.locationSharing ?? true,
      status: insertTourist.status || "safe",
      validUntil: insertTourist.validUntil || null,
      emergencyContacts: insertTourist.emergencyContacts || [],
      itinerary: insertTourist.itinerary || [],
      lastUpdate: new Date(),
    };
    this.tourists.set(id, tourist);
    return tourist;
  }

  async updateTourist(id: string, updates: Partial<Tourist>): Promise<Tourist | undefined> {
    const tourist = this.tourists.get(id);
    if (!tourist) return undefined;
    
    const updatedTourist = { 
      ...tourist, 
      ...updates, 
      lastUpdate: new Date() 
    };
    this.tourists.set(id, updatedTourist);
    return updatedTourist;
  }

  async getAllTourists(): Promise<Tourist[]> {
    return Array.from(this.tourists.values());
  }

  async getAllGeoZones(): Promise<GeoZone[]> {
    return Array.from(this.geoZones.values());
  }

  async createGeoZone(insertZone: InsertGeoZone): Promise<GeoZone> {
    const id = randomUUID();
    const zone: GeoZone = { 
      ...insertZone, 
      id,
      description: insertZone.description || null,
      createdAt: new Date(),
    } as GeoZone;
    this.geoZones.set(id, zone);
    return zone;
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const alert: Alert = { 
      ...insertAlert, 
      id,
      location: insertAlert.location || null,
      lat: insertAlert.lat || null,
      lng: insertAlert.lng || null,
      description: insertAlert.description || null,
      status: insertAlert.status || "active",
      respondedBy: insertAlert.respondedBy || null,
      createdAt: new Date(),
      resolvedAt: null,
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    
    const updatedAlert = { 
      ...alert, 
      ...updates,
      resolvedAt: updates.status === 'resolved' ? new Date() : alert.resolvedAt
    };
    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
  }

  async getAlertsByTourist(touristId: string): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.touristId === touristId);
  }
}

export const storage = new MemStorage();
