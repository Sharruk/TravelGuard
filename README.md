# Tourist Safety Management System

A comprehensive real-time safety monitoring system for tourists and police authorities. The system provides location tracking, emergency response, and safety monitoring capabilities with separate dashboards for tourists and police.

## Features

### Tourist Features
- **Real-time Location Tracking**: Share location with authorities for safety monitoring
- **Emergency Panic Button**: One-click emergency alert system
- **Itinerary Management**: Add and manage travel plans
- **Emergency Contacts**: Maintain emergency contact information
- **Safety Alerts**: Receive safety updates and warnings
- **Safety Score**: Monitor personal safety rating

### Police Features  
- **Tourist Monitoring**: View all active tourists and their locations
- **Alert Management**: Create, update and resolve safety alerts
- **Emergency Response**: Respond to panic button alerts
- **PDF Reports**: Generate detailed safety reports
- **Dashboard Analytics**: View safety statistics and metrics
- **Geo-zone Management**: Monitor restricted and safe zones

## Technology Stack

### Backend
- **Python Flask**: RESTful API server
- **SQLAlchemy**: Database ORM
- **PostgreSQL**: Database
- **ReportLab**: PDF generation
- **Pydantic**: Data validation

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Styling
- **React Query**: Data fetching
- **Leaflet**: Interactive maps
- **Lucide React**: Icons

### Development
- **Vite**: Frontend build tool
- **Node.js**: Development server
- **Express**: API proxy server

## Getting Started

### Prerequisites
- Node.js 18+ 
- Python 3.11+
- PostgreSQL database

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tourist-safety-system
   ```

2. **Install dependencies**
   ```bash
   # Install Node.js dependencies
   npm install
   
   # Install Python dependencies  
   pip install -r requirements.txt
   ```

3. **Database Setup**
   - Create a PostgreSQL database
   - Update database connection in `server/app.py`
   - The system will auto-create tables on first run

4. **Start the application**
   ```bash
   npm run dev
   ```
   
   This will start:
   - Flask backend on port 5001
   - Express proxy server on port 5000
   - React frontend served through the proxy

5. **Access the application**
   - Open http://localhost:5000 in your browser

## Demo Credentials

### Tourist Account
- **Username**: priya.sharma
- **Password**: password123

### Police Account  
- **Username**: raj.desai
- **Password**: password123

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Tourist Endpoints
- `GET /api/tourist/profile/:userId` - Get tourist profile
- `POST /api/tourist/panic/:touristId` - Trigger panic alert
- `GET /api/tourist/alerts/:touristId` - Get tourist alerts
- `POST /api/tourist/itinerary/:touristId` - Add itinerary item
- `PUT /api/tourist/contacts/:touristId` - Update emergency contacts

### Police Endpoints
- `GET /api/police/tourists` - Get all tourists
- `GET /api/police/alerts` - Get all alerts
- `POST /api/police/alerts` - Create new alert
- `PUT /api/police/alert/:alertId` - Update alert status
- `GET /api/police/stats` - Get dashboard statistics
- `GET /api/police/reports/download` - Download PDF report

### Geographic Data
- `GET /api/geo-zones` - Get geographic zones

## Project Structure

```
tourist-safety-system/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   └── ...
├── server/                # Python Flask backend
│   ├── app.py            # Main Flask application
│   ├── index.ts          # Express proxy server
│   └── storage.ts        # Legacy storage utilities
├── shared/               # Shared type definitions
│   └── schema.ts
├── package.json          # Node.js dependencies
├── requirements.txt      # Python dependencies
└── README.md
```

## Development

### Backend Development
The Flask backend (`server/app.py`) provides the REST API endpoints. It uses SQLAlchemy for database operations and includes:

- User authentication
- Tourist profile management  
- Alert system
- PDF report generation
- Geographic data management

### Frontend Development
The React frontend is built with TypeScript and uses:

- React Query for data fetching
- Tailwind CSS for styling
- React Router for navigation
- Leaflet for map functionality

### Database Schema
The system uses the following main entities:

- **Users**: Authentication and profile data
- **Tourists**: Tourist-specific information and tracking
- **Alerts**: Emergency and safety alerts
- **GeoZones**: Geographic boundaries and restrictions

## Security Features

- Password-based authentication
- Role-based access control (Tourist/Police)
- Input validation with Pydantic
- SQL injection prevention with SQLAlchemy
- CORS configuration for API security

## Deployment

The system is designed to run on Replit with:

- Automatic dependency management
- Built-in PostgreSQL database
- Environment variable configuration
- Production-ready deployment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software developed for tourist safety management.

## Support

For technical support or questions about the system, please contact the development team.