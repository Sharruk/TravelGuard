# SafeTourism App Dependencies

## Installation
Run the following command to install all dependencies:
```bash
npm install
```

## Node.js Dependencies
This project uses Node.js and npm for dependency management. All dependencies are listed in package.json:

### Frontend Dependencies
- React 18.3.1 with React DOM
- Vite 5.4.19 for build tooling
- TailwindCSS 3.4.17 for styling
- Radix UI components for accessible UI
- React Query for state management
- Wouter for routing
- Leaflet for maps
- Lucide React for icons
- TypeScript 5.6.3

### Backend Dependencies
- Express 4.21.2 for server
- Drizzle ORM for database
- Zod for validation
- WebSockets for real-time features
- Passport for authentication

### Development Dependencies
- TSX for TypeScript execution
- ESBuild for bundling
- Drizzle Kit for database management
- Various TypeScript types

## Database
The application uses PostgreSQL with Drizzle ORM. The built-in Replit database is recommended.

## Environment Setup
1. Install Node.js dependencies: `npm install`
2. Set up database (automatic with Replit)
3. Start development server: `npm run dev`
4. Build for production: `npm run build`
5. Start production server: `npm start`

All dependencies are managed through package.json and will be installed automatically in the Replit environment.