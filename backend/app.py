from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
from datetime import datetime
import random

app = Flask(__name__)
CORS(app)  # Allow frontend connections

# Temporary in-memory database
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
        
        self.add_sample_users()
    
    def add_sample_users(self):
        # Sample patient with complete data
        self.users.append({
            "id": "patient_123",
            "email": "john@example.com",
            "password": "password123",
            "userType": "patient",
            "fullName": "John Doe",
            "phone": "+1-555-0101",
            "patientData": {
                "uniqueId": "LK123456789",
                "address": "123 Main Street, New York, NY",
                "bloodType": "O+",
                "allergies": ["penicillin", "peanuts"],
                "medications": ["Lisinopril 10mg", "Metformin"],
                "conditions": ["Diabetes", "Hypertension"],
                "emergencyContacts": [
                    {"name": "Jane Doe", "phone": "+1-555-0102", "relation": "Wife"},
                    {"name": "Bob Smith", "phone": "+1-555-0103", "relation": "Brother"}
                ],
                "qrCode": "LIFEKEY:LK123456789:patient_123",
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

# Create database instance
db = TempDatabase()

# Routes
@app.route('/')
def root():
    return jsonify({"message": "LifeKey ID API is running!", "status": "healthy"})

# Authentication
@app.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Check if user exists
    existing_user = next((u for u in db.users if u["email"] == data["email"]), None)
    if existing_user:
        return jsonify({"error": "User already exists"}), 400
    
    # Generate unique ID for patient
    unique_id = f"LK{int(datetime.utcnow().timestamp())}{random.randint(1000, 9999)}"
    
    # Create new user
    new_user = {
        "id": str(uuid.uuid4()),
        "email": data["email"],
        "password": data["password"],
        "userType": data["userType"],
        "fullName": data["fullName"],
        "phone": data["phone"],
        "patientData": None,
        "staffData": None,
        "createdAt": datetime.utcnow().isoformat()
    }
    
    if data["userType"] == "patient":
        new_user["patientData"] = {
            "uniqueId": unique_id,
            "address": data.get("patientData", {}).get("address", ""),
            "bloodType": data.get("patientData", {}).get("bloodType", ""),
            "allergies": data.get("patientData", {}).get("allergies", []),
            "medications": data.get("patientData", {}).get("medications", []),
            "conditions": data.get("patientData", {}).get("conditions", []),
            "emergencyContacts": data.get("patientData", {}).get("emergencyContacts", []),
            "qrCode": f"LIFEKEY:{unique_id}:{new_user['id']}",
            "isVerified": False
        }
    else:
        new_user["staffData"] = data.get("staffData", {})
    
    db.users.append(new_user)
    
    token = f"demo_token_{new_user['id']}"
    
    return jsonify({
        "message": "User registered successfully",
        "token": token,
        "user": {
            "id": new_user["id"],
            "email": new_user["email"],
            "userType": new_user["userType"],
            "fullName": new_user["fullName"],
            "patientData": new_user.get("patientData"),
            "staffData": new_user.get("staffData")
        }
    })

@app.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    user = next((u for u in db.users if u["email"] == data["email"] and u["userType"] == data["userType"]), None)
    
    if not user or user["password"] != data["password"]:
        return jsonify({"error": "Invalid credentials"}), 400
    
    token = f"demo_token_{user['id']}"
    
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "userType": user["userType"],
            "fullName": user["fullName"],
            "patientData": user.get("patientData"),
            "staffData": user.get("staffData")
        }
    })

# Emergency Routes
@app.route('/emergency/report', methods=['POST'])
def report_emergency():
    data = request.get_json()
    
    emergency_id = str(uuid.uuid4())
    
    new_emergency = {
        "id": emergency_id,
        "reporterId": "demo_user",
        "location": data["location"],
        "emergencyType": data.get("emergencyType", "unconscious_person"),
        "description": data.get("description"),
        "status": "reported",
        "priority": "high",
        "createdAt": datetime.utcnow().isoformat()
    }
    
    db.emergencies.append(new_emergency)
    
    print(f"🚨 EMERGENCY REPORTED: {data.get('emergencyType')} at {data['location']}")
    
    return jsonify({
        "message": "Emergency reported successfully! Nearby hospitals have been notified.",
        "emergency": {
            "id": emergency_id,
            "status": "reported",
            "location": data["location"],
            "timestamp": datetime.utcnow().isoformat()
        }
    })

@app.route('/emergency/hospitals/nearby', methods=['GET'])
def get_nearby_hospitals():
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)
    
    # Return hospitals with mock distances
    hospitals_with_distance = []
    for hospital in db.hospitals:
        distance = round(random.uniform(1.0, 5.0), 1)
        
        hospital_data = hospital.copy()
        hospital_data["distance"] = f"{distance} km"
        hospitals_with_distance.append(hospital_data)
    
    # Sort by distance
    hospitals_with_distance.sort(key=lambda x: float(x["distance"].split(" ")[0]))
    
    return jsonify(hospitals_with_distance)

@app.route('/emergency/patient/qr', methods=['POST'])
def get_patient_by_qr():
    data = request.get_json()
    qr_code = data.get("qrCode", "")
    
    # Find patient by QR code
    patient = next((u for u in db.users if u.get("patientData", {}).get("qrCode") == qr_code), None)
    
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    
    print(f"🔍 PATIENT DATA ACCESSED: {patient['fullName']} via QR code")
    
    return jsonify({
        "patient": {
            "id": patient["id"],
            "fullName": patient["fullName"],
            "email": patient["email"],
            "phone": patient["phone"],
            "patientData": patient.get("patientData", {})
        }
    })

@app.route('/emergency/patient/id', methods=['POST'])
def get_patient_by_id():
    data = request.get_json()
    patient_id = data.get("patientId", "").upper()
    
    print(f"🔍 Searching for patient with ID: {patient_id}")
    
    # Find patient by unique ID
    patient = next((u for u in db.users if u.get("patientData", {}).get("uniqueId") == patient_id), None)
    
    if not patient:
        print(f"❌ Patient not found with ID: {patient_id}")
        return jsonify({"error": "Patient not found"}), 404
    
    print(f"✅ PATIENT FOUND: {patient['fullName']} via ID: {patient_id}")
    
    return jsonify({
        "patient": {
            "id": patient["id"],
            "fullName": patient["fullName"],
            "email": patient["email"],
            "phone": patient["phone"],
            "patientData": patient.get("patientData", {})
        }
    })

# Patient Routes
@app.route('/patient/profile', methods=['GET'])
def get_patient_profile():
    # For demo, return the sample patient
    patient = next((u for u in db.users if u["id"] == "patient_123"), None)
    
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    
    return jsonify({
        "patient": {
            "id": patient["id"],
            "fullName": patient["fullName"],
            "email": patient["email"],
            "phone": patient["phone"],
            "patientData": patient.get("patientData", {})
        }
    })

@app.route('/patient/profile', methods=['PUT'])
def update_patient_profile():
    data = request.get_json()
    
    # Find patient (in real app, use auth)
    user = next((u for u in db.users if u["id"] == "patient_123"), None)
    
    if not user:
        return jsonify({"error": "Patient not found"}), 404
    
    # Update all fields
    if 'fullName' in data:
        user["fullName"] = data["fullName"]
    if 'email' in data:
        user["email"] = data["email"]
    if 'phone' in data:
        user["phone"] = data["phone"]
    
    if user.get("patientData"):
        if 'address' in data:
            user["patientData"]["address"] = data["address"]
        if 'bloodType' in data:
            user["patientData"]["bloodType"] = data["bloodType"]
        if 'allergies' in data:
            user["patientData"]["allergies"] = data["allergies"]
        if 'medications' in data:
            user["patientData"]["medications"] = data["medications"]
        if 'conditions' in data:
            user["patientData"]["conditions"] = data["conditions"]
        if 'emergencyContacts' in data:
            user["patientData"]["emergencyContacts"] = data["emergencyContacts"]
    
    return jsonify({
        "message": "Profile updated successfully",
        "patientData": user.get("patientData", {})
    })

# Hospital Routes
@app.route('/hospitals', methods=['GET'])
def get_all_hospitals():
    return jsonify(db.hospitals)

if __name__ == '__main__':
    print("🚀 Starting LifeKey ID API Server...")
    print("📚 API Documentation available at: http://localhost:5000/")
    print("🔗 Your frontend can connect to: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)