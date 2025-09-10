"""
Tourist Safety Management System - Flask Backend
Main application file with all endpoints and configuration.
"""

import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Dict, Any, Optional
import json

from flask import Flask, request, jsonify, send_from_directory, send_file, Response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from pydantic import BaseModel, ValidationError
import logging
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO

# Initialize Flask app
app = Flask(__name__, static_folder='../client', static_url_path='')
CORS(app)

# Database configuration
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
else:
    # Fallback to SQLite for development
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tourist_safety.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models for validation
class LoginRequest(BaseModel):
    username: str
    password: str

class UpdateLocationRequest(BaseModel):
    lat: float
    lng: float
    location: Optional[str] = None

class UserRegistration(BaseModel):
    username: str
    password: str
    role: str
    name: str
    nationality: Optional[str] = None
    badge: Optional[str] = None

class ItineraryItem(BaseModel):
    place: str
    date: str
    time: str
    notes: Optional[str] = None

class EmergencyContact(BaseModel):
    name: str
    phone: str
    relation: str

class UpdateContactsRequest(BaseModel):
    emergencyContacts: List[EmergencyContact]

class UpdateAlertRequest(BaseModel):
    status: str
    respondedBy: Optional[str] = None

class CreateAlertRequest(BaseModel):
    touristId: str
    type: str
    severity: str
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    description: Optional[str] = None

class Coordinate(BaseModel):
    lat: float
    lng: float

class GeoZoneRequest(BaseModel):
    name: str
    type: str
    coordinates: List[Coordinate]
    description: Optional[str] = None

# SQLAlchemy Models
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(50), nullable=False)  # 'tourist' or 'police'
    name = db.Column(db.Text, nullable=False)
    nationality = db.Column(db.Text)
    badge = db.Column(db.Text)  # for police officers
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # Relationship
    tourist = db.relationship('Tourist', backref='user', uselist=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'name': self.name,
            'nationality': self.nationality,
            'badge': self.badge,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class Tourist(db.Model):
    __tablename__ = 'tourists'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    tourist_id = db.Column(db.String(255), unique=True, nullable=False)  # TID-2024-001523 format
    safety_score = db.Column(db.Numeric(5, 2), default=Decimal('85.00'))
    current_location = db.Column(db.Text)
    last_known_lat = db.Column(db.Numeric(10, 8))
    last_known_lng = db.Column(db.Numeric(11, 8))
    location_sharing = db.Column(db.Boolean, default=True)
    status = db.Column(db.String(50), default='safe')  # 'safe', 'caution', 'alert'
    valid_until = db.Column(db.DateTime)
    emergency_contacts = db.Column(db.JSON, default=list)
    itinerary = db.Column(db.JSON, default=list)
    last_update = db.Column(db.DateTime, default=datetime.now)
    
    # Relationship
    alerts = db.relationship('Alert', backref='tourist')
    
    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'touristId': self.tourist_id,
            'safetyScore': str(self.safety_score) if self.safety_score else "85.00",
            'currentLocation': self.current_location,
            'lastKnownLat': str(self.last_known_lat) if self.last_known_lat else None,
            'lastKnownLng': str(self.last_known_lng) if self.last_known_lng else None,
            'locationSharing': self.location_sharing,
            'status': self.status,
            'validUntil': self.valid_until.isoformat() if self.valid_until else None,
            'emergencyContacts': self.emergency_contacts or [],
            'itinerary': self.itinerary or [],
            'lastUpdate': self.last_update.isoformat() if self.last_update else None
        }

class GeoZone(db.Model):
    __tablename__ = 'geo_zones'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'safe', 'caution', 'restricted'
    coordinates = db.Column(db.JSON, nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'coordinates': self.coordinates,
            'description': self.description,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class Alert(db.Model):
    __tablename__ = 'alerts'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tourist_id = db.Column(db.String(36), db.ForeignKey('tourists.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'panic', 'geofence', 'medical', 'missing'
    severity = db.Column(db.String(50), nullable=False)  # 'low', 'medium', 'high', 'critical'
    status = db.Column(db.String(50), default='active')  # 'active', 'resolved', 'investigating'
    location = db.Column(db.Text)
    lat = db.Column(db.Numeric(10, 8))
    lng = db.Column(db.Numeric(11, 8))
    description = db.Column(db.Text)
    responded_by = db.Column(db.String(36), db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.now)
    resolved_at = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'id': self.id,
            'touristId': self.tourist_id,
            'type': self.type,
            'severity': self.severity,
            'status': self.status,
            'location': self.location,
            'lat': str(self.lat) if self.lat else None,
            'lng': str(self.lng) if self.lng else None,
            'description': self.description,
            'respondedBy': self.responded_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'resolvedAt': self.resolved_at.isoformat() if self.resolved_at else None
        }

# Request logging middleware
@app.before_request
def log_request_info():
    if request.path.startswith('/api'):
        start_time = datetime.now()
        request.start_time = start_time

@app.after_request  
def log_response_info(response):
    if hasattr(request, 'start_time') and request.path.startswith('/api'):
        duration = (datetime.now() - request.start_time).total_seconds() * 1000
        log_line = f"{request.method} {request.path} {response.status_code} in {duration:.0f}ms"
        logger.info(log_line)
    return response

# Error handler
@app.errorhandler(Exception)
def handle_error(e):
    logger.error(f"Error: {str(e)}")
    return jsonify({'error': 'Internal server error'}), 500

# Authentication endpoints
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = LoginRequest(**request.json)
        
        user = User.query.filter_by(username=data.username).first()
        if not user or user.password != data.password:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        result = {'user': user.to_dict()}
        
        if user.role == 'tourist':
            tourist = Tourist.query.filter_by(user_id=user.id).first()
            if tourist:
                result['tourist'] = tourist.to_dict()
        
        return jsonify(result)
    
    except ValidationError as e:
        return jsonify({'error': 'Invalid request'}), 400
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = UserRegistration(**request.json)
        
        # Check if username exists
        existing_user = User.query.filter_by(username=data.username).first()
        if existing_user:
            return jsonify({'error': 'Username already exists'}), 400
        
        # Create user
        user = User(
            username=data.username,
            password=data.password,
            role=data.role,
            name=data.name,
            nationality=data.nationality,
            badge=data.badge
        )
        db.session.add(user)
        db.session.flush()  # Get user ID
        
        result = {'user': user.to_dict()}
        
        # If registering as tourist, create tourist profile
        if user.role == 'tourist':
            tourist_id = f"TID-{datetime.now().year}-{str(int(datetime.now().timestamp() * 1000))[-6:]}"
            tourist = Tourist(
                user_id=user.id,
                tourist_id=tourist_id,
                safety_score=Decimal('85.00'),
                current_location="Goa, India",
                last_known_lat=Decimal('15.2993'),
                last_known_lng=Decimal('74.1240'),
                location_sharing=True,
                status='safe',
                valid_until=datetime.now().replace(year=datetime.now().year + 1),  # 1 year validity
                emergency_contacts=[],
                itinerary=[]
            )
            db.session.add(tourist)
            result['tourist'] = tourist.to_dict()
        
        db.session.commit()
        return jsonify(result)
    
    except ValidationError as e:
        return jsonify({'error': 'Invalid request'}), 400
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

# Tourist endpoints
@app.route('/api/tourist/profile/<user_id>', methods=['GET'])
def get_tourist_profile(user_id):
    try:
        tourist = Tourist.query.filter_by(user_id=user_id).first()
        if not tourist:
            return jsonify({'error': 'Tourist not found'}), 404
        
        return jsonify(tourist.to_dict())
    
    except Exception as e:
        logger.error(f"Get tourist profile error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/tourist/location/<tourist_id>', methods=['PUT'])
def update_location(tourist_id):
    try:
        data = UpdateLocationRequest(**request.json)
        
        tourist = Tourist.query.filter_by(tourist_id=tourist_id).first()
        if not tourist:
            return jsonify({'error': 'Tourist not found'}), 404
        
        tourist.last_known_lat = Decimal(str(data.lat))
        tourist.last_known_lng = Decimal(str(data.lng))
        if data.location:
            tourist.current_location = data.location
        tourist.last_update = datetime.now()
        
        db.session.commit()
        return jsonify(tourist.to_dict())
    
    except ValidationError as e:
        return jsonify({'error': 'Invalid request'}), 400
    except Exception as e:
        logger.error(f"Update location error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/tourist/panic/<tourist_id>', methods=['POST'])
def panic_button(tourist_id):
    try:
        tourist = Tourist.query.filter_by(tourist_id=tourist_id).first()
        if not tourist:
            return jsonify({'error': 'Tourist not found'}), 404
        
        # Create alert
        alert = Alert(
            tourist_id=tourist.id,
            type='panic',
            severity='critical',
            status='active',
            location=tourist.current_location or 'Unknown',
            lat=tourist.last_known_lat,
            lng=tourist.last_known_lng,
            description='Panic button activated'
        )
        db.session.add(alert)
        
        # Update tourist status
        tourist.status = 'alert'
        tourist.last_update = datetime.now()
        
        db.session.commit()
        return jsonify(alert.to_dict())
    
    except Exception as e:
        logger.error(f"Panic button error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/tourist/alerts/<tourist_id>', methods=['GET'])
def get_tourist_alerts(tourist_id):
    try:
        tourist = Tourist.query.filter_by(tourist_id=tourist_id).first()
        if not tourist:
            return jsonify({'error': 'Tourist not found'}), 404
        
        alerts = Alert.query.filter_by(tourist_id=tourist.id).all()
        return jsonify([alert.to_dict() for alert in alerts])
    
    except Exception as e:
        logger.error(f"Get tourist alerts error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/tourist/itinerary/<tourist_id>', methods=['POST'])
def add_itinerary_item(tourist_id):
    try:
        data = ItineraryItem(**request.json)
        
        # Try both database ID and tourist_id
        tourist = Tourist.query.filter_by(id=tourist_id).first()
        if not tourist:
            tourist = Tourist.query.filter_by(tourist_id=tourist_id).first()
        if not tourist:
            return jsonify({'error': 'Tourist not found'}), 404
        
        # Add new itinerary item
        existing_itinerary = tourist.itinerary or []
        new_item = {
            'place': data.place,
            'date': data.date,
            'time': data.time,
            'notes': data.notes
        }
        existing_itinerary.append(new_item)
        
        tourist.itinerary = existing_itinerary
        tourist.last_update = datetime.now()
        
        db.session.commit()
        return jsonify(tourist.to_dict())
    
    except ValidationError as e:
        return jsonify({'error': 'Invalid request'}), 400
    except Exception as e:
        logger.error(f"Add itinerary error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to add itinerary item'}), 400

@app.route('/api/tourist/contacts/<tourist_id>', methods=['PUT'])
def update_emergency_contacts(tourist_id):
    try:
        data = UpdateContactsRequest(**request.json)
        
        # Try both database ID and tourist_id
        tourist = Tourist.query.filter_by(id=tourist_id).first()
        if not tourist:
            tourist = Tourist.query.filter_by(tourist_id=tourist_id).first()
        if not tourist:
            return jsonify({'error': 'Tourist not found'}), 404
        
        # Update emergency contacts
        contacts = [contact.dict() for contact in data.emergencyContacts]
        tourist.emergency_contacts = contacts
        tourist.last_update = datetime.now()
        
        db.session.commit()
        return jsonify(tourist.to_dict())
    
    except ValidationError as e:
        return jsonify({'error': 'Invalid request'}), 400
    except Exception as e:
        logger.error(f"Update contacts error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to update emergency contacts'}), 400

# Police endpoints
@app.route('/api/police/tourists', methods=['GET'])
def get_all_tourists():
    try:
        tourists = Tourist.query.all()
        return jsonify([tourist.to_dict() for tourist in tourists])
    
    except Exception as e:
        logger.error(f"Get all tourists error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/police/alerts', methods=['GET'])
def get_active_alerts():
    try:
        alerts = Alert.query.filter_by(status='active').all()
        return jsonify([alert.to_dict() for alert in alerts])
    
    except Exception as e:
        logger.error(f"Get active alerts error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/police/alert/<alert_id>', methods=['PUT'])
def update_alert(alert_id):
    try:
        data = UpdateAlertRequest(**request.json)
        
        alert = Alert.query.get(alert_id)
        if not alert:
            return jsonify({'error': 'Alert not found'}), 404
        
        alert.status = data.status
        if data.respondedBy:
            alert.responded_by = data.respondedBy
        
        if data.status == 'resolved':
            alert.resolved_at = datetime.now()
        
        db.session.commit()
        return jsonify(alert.to_dict())
    
    except ValidationError as e:
        return jsonify({'error': 'Invalid request'}), 400
    except Exception as e:
        logger.error(f"Update alert error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

# Geo zones endpoints
@app.route('/api/geo-zones', methods=['GET'])
def get_geo_zones():
    try:
        zones = GeoZone.query.all()
        return jsonify([zone.to_dict() for zone in zones])
    
    except Exception as e:
        logger.error(f"Get geo zones error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/geo-zones', methods=['POST'])
def create_geo_zone():
    try:
        data = GeoZoneRequest(**request.json)
        
        zone = GeoZone(
            name=data.name,
            type=data.type,
            coordinates=[coord.dict() for coord in data.coordinates],
            description=data.description
        )
        
        db.session.add(zone)
        db.session.commit()
        return jsonify(zone.to_dict())
    
    except ValidationError as e:
        return jsonify({'error': 'Invalid request'}), 400
    except Exception as e:
        logger.error(f"Create geo zone error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

# Statistics endpoint for police dashboard
@app.route('/api/police/stats', methods=['GET'])
def get_police_stats():
    try:
        tourists = Tourist.query.all()
        alerts = Alert.query.filter_by(status='active').all()
        zones = GeoZone.query.filter_by(type='restricted').all()
        
        # Calculate average safety score
        if tourists:
            avg_score = sum(float(t.safety_score or 0) for t in tourists) / len(tourists)
        else:
            avg_score = 0.0
        
        stats = {
            'activeTourists': len(tourists),
            'activeAlerts': len(alerts),
            'highRiskZones': len(zones),
            'averageSafetyScore': f"{avg_score:.1f}"
        }
        
        return jsonify(stats)
    
    except Exception as e:
        logger.error(f"Get police stats error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# Create alert endpoint for police
@app.route('/api/police/alerts', methods=['POST'])
def create_alert():
    try:
        data = CreateAlertRequest(**request.json)
        
        # Find tourist by ID or tourist_id
        tourist = Tourist.query.filter_by(id=data.touristId).first()
        if not tourist:
            tourist = Tourist.query.filter_by(tourist_id=data.touristId).first()
        if not tourist:
            return jsonify({'error': 'Tourist not found'}), 404
        
        alert = Alert(
            tourist_id=tourist.id,
            type=data.type,
            severity=data.severity,
            status='active',
            location=data.location or tourist.current_location,
            lat=Decimal(str(data.lat)) if data.lat else tourist.last_known_lat,
            lng=Decimal(str(data.lng)) if data.lng else tourist.last_known_lng,
            description=data.description
        )
        
        db.session.add(alert)
        
        # Update tourist status based on severity
        if data.severity in ['high', 'critical']:
            tourist.status = 'alert'
        elif data.severity == 'medium':
            tourist.status = 'caution'
        
        tourist.last_update = datetime.now()
        
        db.session.commit()
        return jsonify(alert.to_dict())
    
    except ValidationError as e:
        return jsonify({'error': 'Invalid request'}), 400
    except Exception as e:
        logger.error(f"Create alert error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

# PDF report generation
@app.route('/api/police/reports/download', methods=['GET'])
def download_report():
    try:
        # Get all data for the report
        tourists = Tourist.query.all()
        alerts = Alert.query.all()
        zones = GeoZone.query.all()
        
        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title = Paragraph("Tourist Safety Management System - Report", styles['Title'])
        story.append(title)
        story.append(Spacer(1, 20))
        
        # Current date
        date_para = Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal'])
        story.append(date_para)
        story.append(Spacer(1, 20))
        
        # Summary section
        summary_title = Paragraph("Summary", styles['Heading1'])
        story.append(summary_title)
        
        summary_data = [
            ['Metric', 'Count'],
            ['Total Tourists', str(len(tourists))],
            ['Active Alerts', str(len([a for a in alerts if a.status == 'active']))],
            ['Total Geo Zones', str(len(zones))],
            ['High Risk Zones', str(len([z for z in zones if z.type == 'restricted']))]
        ]
        
        summary_table = Table(summary_data)
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 30))
        
        # Tourists section
        tourists_title = Paragraph("Tourist Details", styles['Heading1'])
        story.append(tourists_title)
        
        tourist_data = [['Tourist ID', 'Name', 'Safety Score', 'Status', 'Location']]
        for tourist in tourists[:10]:  # Limit to first 10 for space
            user = User.query.get(tourist.user_id)
            tourist_data.append([
                tourist.tourist_id,
                user.name if user else 'Unknown',
                tourist.safety_score or '0',
                tourist.status or 'safe',
                tourist.current_location or 'Unknown'
            ])
        
        tourist_table = Table(tourist_data)
        tourist_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(tourist_table)
        story.append(Spacer(1, 30))
        
        # Alerts section
        alerts_title = Paragraph("Active Alerts", styles['Heading1'])
        story.append(alerts_title)
        
        active_alerts = [a for a in alerts if a.status == 'active']
        alert_data = [['Alert ID', 'Type', 'Severity', 'Location', 'Created']]
        for alert in active_alerts[:10]:  # Limit to first 10
            alert_data.append([
                alert.id[:8] + '...',
                alert.type,
                alert.severity,
                alert.location or 'Unknown',
                alert.created_at.strftime('%Y-%m-%d %H:%M') if alert.created_at else 'Unknown'
            ])
        
        if len(alert_data) > 1:
            alert_table = Table(alert_data)
            alert_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(alert_table)
        else:
            no_alerts = Paragraph("No active alerts", styles['Normal'])
            story.append(no_alerts)
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        # Return PDF as response
        return Response(
            buffer.getvalue(),
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename=tourist_safety_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
            }
        )
    
    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}")
        return jsonify({'error': 'Failed to generate report'}), 500

# Health check endpoint
@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'backend': 'flask'})

# Frontend is handled by Express/Vite, so remove frontend routes from Flask

# Initialize database and demo data
def init_demo_data():
    """Initialize database with demo data"""
    try:
        # Create demo tourist user
        tourist_user = User(
            id="user-1",
            username="priya.sharma",
            password="password123",
            role="tourist",
            name="Priya Sharma",
            nationality="Indian"
        )
        db.session.add(tourist_user)
        
        # Create demo police user
        police_user = User(
            id="user-2",
            username="raj.desai",
            password="password123",
            role="police",
            name="Officer Raj Desai",
            nationality="Indian",
            badge="GP-1234"
        )
        db.session.add(police_user)
        
        # Create demo tourist
        tourist = Tourist(
            id="tourist-1",
            user_id="user-1",
            tourist_id="TID-2024-001523",
            safety_score=Decimal('87.00'),
            current_location="Calangute Beach, Goa",
            last_known_lat=Decimal('15.5527'),
            last_known_lng=Decimal('73.7547'),
            location_sharing=True,
            status='safe',
            valid_until=datetime(2024, 12, 30),
            emergency_contacts=[
                {"name": "Rahul Sharma", "phone": "+91 98765-43210", "relation": "Brother"},
                {"name": "Maya Sharma", "phone": "+91 98765-43211", "relation": "Mother"}
            ],
            itinerary=[
                {"place": "Calangute Beach", "date": "2024-12-26", "time": "9:00 AM - 2:00 PM"},
                {"place": "Old Goa Churches", "date": "2024-12-27", "time": "10:00 AM - 4:00 PM"},
                {"place": "Spice Plantation Tour", "date": "2024-12-28", "time": "8:00 AM - 6:00 PM"}
            ]
        )
        db.session.add(tourist)
        
        # Create additional demo tourists
        tourist2 = Tourist(
            id="tourist-2",
            user_id="user-1",  # Use existing user ID
            tourist_id="TID-2024-001524",
            safety_score=Decimal('73.00'),
            current_location="Anjuna Beach",
            last_known_lat=Decimal('15.5937'),
            last_known_lng=Decimal('73.7370'),
            location_sharing=True,
            status='caution',
            valid_until=datetime(2024, 12, 30),
            emergency_contacts=[],
            itinerary=[]
        )
        db.session.add(tourist2)
        
        tourist3 = Tourist(
            id="tourist-3",
            user_id="user-1",  # Use existing user ID  
            tourist_id="TID-2024-001525",
            safety_score=Decimal('91.00'),
            current_location="Old Goa",
            last_known_lat=Decimal('15.5007'),
            last_known_lng=Decimal('73.9119'),
            location_sharing=True,
            status='safe',
            valid_until=datetime(2024, 12, 30),
            emergency_contacts=[],
            itinerary=[]
        )
        db.session.add(tourist3)
        
        # Create demo geo zones
        restricted_zone = GeoZone(
            id="zone-1",
            name="Restricted Military Area",
            type="restricted",
            coordinates=[
                {"lat": 15.4800, "lng": 73.8200},
                {"lat": 15.4850, "lng": 73.8200},
                {"lat": 15.4850, "lng": 73.8300},
                {"lat": 15.4800, "lng": 73.8300}
            ],
            description="Military restricted area - entry prohibited"
        )
        db.session.add(restricted_zone)
        
        caution_zone = GeoZone(
            id="zone-2",
            name="Unsafe Beach Area",
            type="caution",
            coordinates=[
                {"lat": 15.5600, "lng": 73.7400},
                {"lat": 15.5650, "lng": 73.7400},
                {"lat": 15.5650, "lng": 73.7500},
                {"lat": 15.5600, "lng": 73.7500}
            ],
            description="High tide and strong currents - exercise caution"
        )
        db.session.add(caution_zone)
        
        # Create demo alert
        panic_alert = Alert(
            id="alert-1",
            tourist_id="tourist-1",
            type="panic",
            severity="critical",
            status="active",
            location="Baga Beach, Near Tito's Club",
            lat=Decimal('15.5527'),
            lng=Decimal('73.7547'),
            description="Panic button triggered"
        )
        db.session.add(panic_alert)
        
        db.session.commit()
        logger.info("Demo data initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing demo data: {str(e)}")
        db.session.rollback()

# Initialize database
with app.app_context():
    db.create_all()
    
    # Check if demo data already exists
    if not User.query.first():
        init_demo_data()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)