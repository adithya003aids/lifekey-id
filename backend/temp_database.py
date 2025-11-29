# Temporary in-memory database for demo
class TempDatabase:
    def __init__(self):
        self.users = []
        self.emergencies = []
        self.hospitals = [
            {
                "id": "1",
                "name": "City General Hospital",
                "location": {"lat": 40.7128, "lng": -74.0060, "address": "123 Medical Center Dr"},
                "emergencyPhone": "+1-555-0123",
                "generalPhone": "+1-555-0124",
                "departments": ["Emergency", "Cardiology", "Trauma"],
                "distance": "2.3 km"
            },
            {
                "id": "2", 
                "name": "Community Medical Center",
                "location": {"lat": 40.7215, "lng": -74.0052, "address": "456 Health Ave"},
                "emergencyPhone": "+1-555-0456", 
                "generalPhone": "+1-555-0457",
                "departments": ["Emergency", "Oncology"],
                "distance": "3.1 km"
            }
        ]
        
        # Add sample users for demo
        self.add_sample_users()
    
    def add_sample_users(self):
        # Sample patient
        self.users.append({
            "id": "patient_123",
            "email": "john@example.com",
            "password": "password123",  # Simple password for demo
            "userType": "patient",
            "fullName": "John Doe",
            "phone": "+1-555-0101",
            "patientData": {
                "bloodType": "O+",
                "allergies": ["penicillin", "peanuts"],
                "medications": ["Lisinopril 10mg", "Metformin"],
                "conditions": ["Diabetes", "Hypertension"],
                "emergencyContacts": [
                    {"name": "Jane Doe", "phone": "+1-555-0102", "relation": "Wife"}
                ],
                "qrCode": "VT_123_ABC",
                "isVerified": True
            },
            "createdAt": "2024-01-20T10:00:00Z"
        })
        
        # Sample doctor
        self.users.append({
            "id": "doctor_456",
            "email": "dr.smith@hospital.com", 
            "password": "password123",
            "userType": "doctor",
            "fullName": "Dr. Sarah Smith",
            "phone": "+1-555-0202",
            "staffData": {
                "licenseNumber": "MED123456",
                "hospital": "City General Hospital",
                "department": "Emergency Medicine",
                "specialization": "Trauma Surgery",
                "licenseVerified": True,
                "accessLevel": "full"
            },
            "createdAt": "2024-01-20T10:00:00Z"
        })

# Create global database instance
db = TempDatabase()