// Tourist Dashboard JavaScript

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeTouristDashboard();
});

function initializeTouristDashboard() {
    // Initialize map
    initializeMap();
    
    // Initialize panic button
    initializePanicButton();
    
    // Initialize location sharing
    initializeLocationSharing();
    
    // Initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Map functionality
let touristMap = null;
let userMarker = null;

function initializeMap() {
    const mapContainer = document.getElementById('touristMap');
    if (!mapContainer) return;
    
    // Default location (Goa)
    const defaultLat = 15.2993;
    const defaultLng = 74.1240;
    
    // Initialize map
    touristMap = L.map('touristMap').setView([defaultLat, defaultLng], 13);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(touristMap);
    
    // Add user marker
    userMarker = L.marker([defaultLat, defaultLng])
        .addTo(touristMap)
        .bindPopup('Your current location')
        .openPopup();
    
    // Add sample safe zones
    addSafeZones();
    
    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Update map view and marker
                touristMap.setView([lat, lng], 15);
                userMarker.setLatLng([lat, lng]);
                
                // Update location on server
                updateLocationOnServer(lat, lng);
            },
            (error) => {
                console.log('Location access denied or unavailable');
            }
        );
    }
}

function addSafeZones() {
    if (!touristMap) return;
    
    // Sample safe zones
    const safeZones = [
        {
            center: [15.2993, 74.1240],
            radius: 500,
            type: 'safe',
            name: 'Tourist Area'
        },
        {
            center: [15.2700, 74.1240],
            radius: 300,
            type: 'caution',
            name: 'Market Area'
        }
    ];
    
    safeZones.forEach(zone => {
        const color = zone.type === 'safe' ? 'green' : zone.type === 'caution' ? 'orange' : 'red';
        
        L.circle(zone.center, {
            color: color,
            fillColor: color,
            fillOpacity: 0.2,
            radius: zone.radius
        }).addTo(touristMap).bindPopup(zone.name);
    });
}

async function updateLocationOnServer(lat, lng) {
    try {
        const tourist = storage.get('tourist');
        if (!tourist || !tourist.touristId) return;
        
        await apiRequest('PUT', `/api/tourist/location/${tourist.touristId}`, {
            lat: lat,
            lng: lng,
            location: 'Updated from GPS'
        });
        
        console.log('Location updated successfully');
    } catch (error) {
        console.error('Failed to update location:', error);
    }
}

// Panic button functionality
function initializePanicButton() {
    const panicButton = document.getElementById('panicButton');
    if (!panicButton) return;
    
    panicButton.addEventListener('click', handlePanicButton);
}

async function handlePanicButton() {
    const confirmed = confirm('Are you sure you want to trigger an emergency alert? This will notify the police immediately.');
    
    if (!confirmed) return;
    
    try {
        const panicButton = document.getElementById('panicButton');
        panicButton.disabled = true;
        panicButton.innerHTML = '<div class="spinner mr-2"></div>Sending Alert...';
        
        // Get current location if available
        let currentLocation = null;
        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
            } catch (error) {
                console.log('Could not get current location');
            }
        }
        
        // Get tourist ID from session or localStorage
        const user = storage.get('user');
        const tourist = storage.get('tourist');
        
        if (!tourist || !tourist.touristId) {
            throw new Error('Tourist information not found');
        }
        
        // Send panic alert
        const response = await apiRequest('POST', `/api/tourist/panic/${tourist.touristId}`, currentLocation);
        
        toast.show('Emergency alert sent! Police have been notified.', 'success');
        
        // Refresh page to show new alert
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        toast.show('Failed to send emergency alert. Please try again.', 'destructive');
        console.error('Panic button error:', error);
    } finally {
        const panicButton = document.getElementById('panicButton');
        panicButton.disabled = false;
        panicButton.innerHTML = '<i data-lucide="alert-triangle" class="w-4 h-4 mr-2"></i>Emergency';
        lucide.createIcons();
    }
}

// Location sharing functionality
function initializeLocationSharing() {
    const locationSwitch = document.getElementById('locationSharing');
    if (!locationSwitch) return;
    
    locationSwitch.addEventListener('change', handleLocationSharingToggle);
}

async function handleLocationSharingToggle(event) {
    const enabled = event.target.checked;
    
    try {
        // Store preference
        storage.set('locationSharing', enabled);
        
        if (enabled) {
            // Start location tracking
            startLocationTracking();
            toast.show('Location sharing enabled', 'success');
        } else {
            // Stop location tracking
            stopLocationTracking();
            toast.show('Location sharing disabled', 'warning');
        }
    } catch (error) {
        console.error('Error toggling location sharing:', error);
        toast.show('Failed to update location sharing preference', 'destructive');
    }
}

let locationWatchId = null;

function startLocationTracking() {
    if (!navigator.geolocation) {
        toast.show('Geolocation is not supported by this browser', 'destructive');
        return;
    }
    
    // Stop existing tracking
    stopLocationTracking();
    
    // Start new tracking
    locationWatchId = navigator.geolocation.watchPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Update map if visible
            if (userMarker && touristMap) {
                userMarker.setLatLng([lat, lng]);
            }
            
            // Update server (debounced)
            debouncedLocationUpdate(lat, lng);
        },
        (error) => {
            console.error('Location tracking error:', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000 // 1 minute
        }
    );
}

function stopLocationTracking() {
    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
    }
}

// Debounced location update to avoid too many API calls
const debouncedLocationUpdate = utils.debounce(updateLocationOnServer, 30000); // 30 seconds

// Tab switching functionality (inherited from common.js)
// Additional tourist-specific functionality can be added here

// Itinerary functionality
function showAddItineraryModal() {
    // This would show a modal to add itinerary items
    // For now, we'll use a simple prompt
    const place = prompt('Enter place name:');
    if (!place) return;
    
    const date = prompt('Enter date (YYYY-MM-DD):');
    if (!date) return;
    
    const time = prompt('Enter time (HH:MM):');
    if (!time) return;
    
    const notes = prompt('Enter notes (optional):') || '';
    
    addItineraryItem({ place, date, time, notes });
}

async function addItineraryItem(item) {
    try {
        const tourist = storage.get('tourist');
        if (!tourist || !tourist.id) {
            throw new Error('Tourist information not found');
        }
        
        const response = await apiRequest('POST', `/api/tourist/itinerary/${tourist.id}`, item);
        
        toast.show('Itinerary item added successfully', 'success');
        
        // Update stored tourist data with response
        if (response) {
            storage.set('tourist', response);
        }
        
        // Refresh page to show updated data
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        toast.show('Failed to add itinerary item', 'destructive');
        console.error('Add itinerary error:', error);
    }
}

// Add event listener for add itinerary button
document.addEventListener('DOMContentLoaded', function() {
    const addItineraryBtn = document.querySelector('[data-testid="button-add-itinerary"]');
    if (addItineraryBtn) {
        addItineraryBtn.addEventListener('click', showAddItineraryModal);
    }
});

// Auto-refresh alerts every 30 seconds
setInterval(() => {
    refreshAlerts();
}, 30000);

async function refreshAlerts() {
    try {
        const tourist = storage.get('tourist');
        if (!tourist || !tourist.touristId) return;
        
        const alerts = await apiRequest('GET', `/api/tourist/alerts/${tourist.touristId}`);
        
        // Update alert count in UI if needed
        const currentAlertCount = document.querySelectorAll('[data-testid^="alert-"]').length;
        if (alerts.length > currentAlertCount) {
            // New alerts available, could show notification
            toast.show('New alerts received', 'warning');
        }
        
    } catch (error) {
        console.error('Failed to refresh alerts:', error);
    }
}