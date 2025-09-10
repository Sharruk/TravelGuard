import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTouristSchema, insertAlertSchema, insertGeoZoneSchema } from "@shared/schema";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const updateLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  location: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      let tourist = null;
      if (user.role === "tourist") {
        tourist = await storage.getTouristByUserId(user.id);
      }

      res.json({ user, tourist });
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const user = await storage.createUser(userData);
      
      // If registering as tourist, create tourist profile
      if (user.role === "tourist") {
        const touristId = `TID-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        const tourist = await storage.createTourist({
          userId: user.id,
          touristId,
          safetyScore: "85.00",
          currentLocation: "Goa, India",
          lastKnownLat: "15.2993",
          lastKnownLng: "74.1240",
          locationSharing: true,
          status: "safe",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          emergencyContacts: [],
          itinerary: [],
        });
        
        return res.json({ user, tourist });
      }

      res.json({ user });
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // Tourist routes
  app.get("/api/tourist/profile/:userId", async (req, res) => {
    try {
      const tourist = await storage.getTouristByUserId(req.params.userId);
      if (!tourist) {
        return res.status(404).json({ error: "Tourist not found" });
      }
      res.json(tourist);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/tourist/location/:touristId", async (req, res) => {
    try {
      const { lat, lng, location } = updateLocationSchema.parse(req.body);
      const tourist = await storage.getTouristByTouristId(req.params.touristId);
      
      if (!tourist) {
        return res.status(404).json({ error: "Tourist not found" });
      }

      const updatedTourist = await storage.updateTourist(tourist.id, {
        lastKnownLat: lat.toString(),
        lastKnownLng: lng.toString(),
        currentLocation: location,
      });

      res.json(updatedTourist);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.post("/api/tourist/panic/:touristId", async (req, res) => {
    try {
      const tourist = await storage.getTouristByTouristId(req.params.touristId);
      if (!tourist) {
        return res.status(404).json({ error: "Tourist not found" });
      }

      const alert = await storage.createAlert({
        touristId: tourist.id,
        type: "panic",
        severity: "critical",
        status: "active",
        location: tourist.currentLocation || "Unknown",
        lat: tourist.lastKnownLat,
        lng: tourist.lastKnownLng,
        description: "Panic button activated",
        respondedBy: null,
      });

      // Update tourist status to alert
      await storage.updateTourist(tourist.id, { status: "alert" });

      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/tourist/alerts/:touristId", async (req, res) => {
    try {
      const tourist = await storage.getTouristByTouristId(req.params.touristId);
      if (!tourist) {
        return res.status(404).json({ error: "Tourist not found" });
      }

      const alerts = await storage.getAlertsByTourist(tourist.id);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Tourist itinerary and contacts management
  app.post("/api/tourist/itinerary/:touristId", async (req, res) => {
    try {
      const { touristId } = req.params;
      const { place, date, time, notes } = req.body;
      
      const tourist = await storage.getTouristById(touristId);
      if (!tourist) {
        return res.status(404).json({ error: "Tourist not found" });
      }

      const existingItinerary = tourist.itinerary || [];
      const newItinerary = [...existingItinerary, { place, date, time, notes }];
      
      const updatedTourist = await storage.updateTourist(touristId, {
        ...tourist,
        itinerary: newItinerary,
      });

      res.json(updatedTourist);
    } catch (error) {
      res.status(400).json({ error: "Failed to add itinerary item" });
    }
  });

  app.put("/api/tourist/contacts/:touristId", async (req, res) => {
    try {
      const { touristId } = req.params;
      const { emergencyContacts } = req.body;
      
      const tourist = await storage.getTouristById(touristId);
      if (!tourist) {
        return res.status(404).json({ error: "Tourist not found" });
      }

      const updatedTourist = await storage.updateTourist(touristId, {
        ...tourist,
        emergencyContacts,
      });

      res.json(updatedTourist);
    } catch (error) {
      res.status(400).json({ error: "Failed to update emergency contacts" });
    }
  });

  // Police routes
  app.get("/api/police/tourists", async (req, res) => {
    try {
      const tourists = await storage.getAllTourists();
      res.json(tourists);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/police/alerts", async (req, res) => {
    try {
      const alerts = await storage.getActiveAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/police/alert/:alertId", async (req, res) => {
    try {
      const { status, respondedBy } = req.body;
      const alert = await storage.updateAlert(req.params.alertId, {
        status,
        respondedBy,
      });
      
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Geo zones
  app.get("/api/geo-zones", async (req, res) => {
    try {
      const zones = await storage.getAllGeoZones();
      res.json(zones);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/geo-zones", async (req, res) => {
    try {
      const zoneData = insertGeoZoneSchema.parse(req.body);
      const zone = await storage.createGeoZone(zoneData);
      res.json(zone);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // Statistics for police dashboard
  app.get("/api/police/stats", async (req, res) => {
    try {
      const tourists = await storage.getAllTourists();
      const alerts = await storage.getActiveAlerts();
      const zones = await storage.getAllGeoZones();

      const stats = {
        activeTourists: tourists.length,
        activeAlerts: alerts.length,
        highRiskZones: zones.filter(z => z.type === 'restricted').length,
        averageSafetyScore: tourists.length > 0 
          ? (tourists.reduce((sum, t) => sum + parseFloat(t.safetyScore || "0"), 0) / tourists.length).toFixed(1)
          : "0.0"
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
