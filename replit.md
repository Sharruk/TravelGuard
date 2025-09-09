# Tourist Safety Management System

## Overview

This is a full-stack web application designed for tourist safety management in destinations like Goa. The system provides real-time tracking, emergency response, and safety monitoring capabilities for tourists, with a comprehensive dashboard for police authorities to monitor and respond to incidents.

The application features two main user interfaces: a tourist dashboard for safety monitoring and emergency alerts, and a police dashboard for comprehensive oversight of all tourists and incidents. The system includes real-time location tracking, geofencing capabilities, panic button functionality, and interactive mapping features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and better development experience
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component system for consistent design
- **Styling**: Tailwind CSS with CSS variables for theming support
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for full-stack type safety
- **API Design**: RESTful API endpoints with proper error handling
- **Storage Layer**: Abstracted storage interface supporting both in-memory and database implementations
- **Session Management**: Express session handling with PostgreSQL session store
- **Development**: Hot module replacement and development middleware integration

### Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Data Models**: Users, tourists, geo-zones, and alerts with proper relationships
- **Validation**: Zod schemas for runtime type validation and data integrity

### Authentication and Authorization
- **Authentication Method**: Username/password based authentication
- **Role-Based Access**: Tourist and police user roles with different dashboard access
- **Session Storage**: Persistent sessions with PostgreSQL backing
- **Client Storage**: Local storage for user session persistence across page reloads

### External Dependencies
- **Mapping Service**: Leaflet.js for interactive maps and geospatial visualization
- **Database Hosting**: Neon Database for serverless PostgreSQL
- **Development Tools**: Replit integration for cloud development environment
- **Session Store**: connect-pg-simple for PostgreSQL session management
- **Date Handling**: date-fns for date manipulation and formatting
- **Form Handling**: React Hook Form with Hookform resolvers for form validation

### Key Features
- **Real-time Location Tracking**: GPS-based location updates with privacy controls
- **Emergency Response**: Panic button functionality with immediate alert dispatch
- **Geofencing**: Safe zone monitoring with automatic alerts for boundary violations
- **Multi-role Dashboard**: Separate interfaces for tourists and police with role-appropriate features
- **Safety Scoring**: Dynamic safety score calculation based on location and behavior patterns
- **Interactive Mapping**: Real-time visualization of tourist locations, safe zones, and incidents
- **Alert Management**: Comprehensive alert system with different severity levels and status tracking