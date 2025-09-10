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

- **Python Flask**: Web framework and RESTful API server
- **Jinja2**: Server-side templating engine
- **SQLAlchemy**: Database ORM
- **PostgreSQL**: Database
- **ReportLab**: PDF generation
- **Pydantic**: Data validation
- **Tailwind CSS**: Styling
- **Leaflet**: Interactive maps
- **Vanilla JavaScript**: Client-side functionality

## Getting Started

### Prerequisites
- Python 3.11+
- PostgreSQL database (or use Replit's built-in database)

### Step-by-Step Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tourist-safety-system
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```
   
   Required packages:
   - flask==3.1.2
   - flask-sqlalchemy==3.1.1
   - psycopg2-binary==2.9.10
   - pydantic==2.11.7
   - reportlab==4.4.3
   - python-dotenv==1.1.1

3. **Database Setup**
   - If using Replit: The PostgreSQL database is automatically provided
   - If running locally: Create a PostgreSQL database and update the connection string in `server/app.py`
   - The system will automatically create all required tables on first run

4. **Start the application**
   ```bash
   python3 run_flask.py
   ```
   
   Or run directly:
   ```bash
   cd server && python3 app.py
   ```

5. **Access the application**
   - Open http://localhost:5000 in your browser
   - The Flask server handles both frontend and API requests

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
├── server/                # Python Flask backend
│   └── app.py            # Main Flask application
├── templates/             # Jinja2 HTML templates
│   ├── base.html         # Base template
│   ├── login.html        # Login page
│   └── tourist_dashboard.html # Tourist dashboard
├── static/               # Static assets
│   ├── css/
│   │   └── style.css     # Tailwind CSS styles
│   └── js/
│       ├── common.js     # Common JavaScript utilities
│       └── tourist.js    # Tourist dashboard functionality
├── requirements.txt      # Python dependencies
├── run_flask.py         # Application startup script
└── README.md
```

## Development

### Flask Application
The main Flask application (`server/app.py`) provides:

- **Web Routes**: Serves HTML templates with Jinja2
- **API Endpoints**: RESTful API for frontend interactions
- **Database Operations**: SQLAlchemy ORM for data management
- **Authentication**: Session-based user authentication
- **PDF Generation**: ReportLab for generating safety reports

### Frontend Architecture
The frontend uses server-side rendering with:

- **Jinja2 Templates**: Dynamic HTML generation
- **Tailwind CSS**: Utility-first styling framework
- **Vanilla JavaScript**: Client-side interactions and API calls
- **Leaflet Maps**: Interactive location mapping
- **Local Storage**: Client-side data persistence

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