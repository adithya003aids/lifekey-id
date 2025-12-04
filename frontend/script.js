// API Configuration
const API_BASE = "http://127.0.0.1:5000";

// Global state
let currentUser = null;
let hospitalsData = [];
let patientUniqueId = '';
let patientQRData = '';

// Test backend connection
async function testConnection() {
    try {
        const response = await fetch(`${API_BASE}/`);
        if (response.ok) {
            console.log("✅ Backend connection successful!");
            return true;
        }
    } catch (error) {
        console.error("❌ Backend connection failed:", error);
        return false;
    }
}

// QR Code Generator
function generateQRCode(text, elementId) {
    const qrElement = document.getElementById(elementId);
    if (!qrElement) return;
    
    qrElement.innerHTML = '';
    
    try {
        if (typeof QRCode !== 'undefined') {
            QRCode.toCanvas(qrElement, text, {
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            }, function(error) {
                if (error) {
                    console.error('QR Generation error:', error);
                    qrElement.innerHTML = `<div class="qr-fallback">QR: ${text}</div>`;
                }
            });
        } else {
            qrElement.innerHTML = `<div class="qr-fallback">QR Code: ${text}</div>`;
        }
    } catch (error) {
        console.error('QR Code generation failed:', error);
        qrElement.innerHTML = `<div class="qr-fallback">QR: ${text}</div>`;
    }
}

// Generate unique ID
function generateUniqueId() {
    return 'LK' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Generate QR with complete patient data
function generateCompleteDataQR(patientData) {
    const completeData = {
        type: "LIFEKEY_MEDICAL_RECORD",
        version: "1.0",
        patientId: patientData.uniqueId,
        name: currentUser.fullName,
        phone: currentUser.phone,
        bloodType: patientData.bloodType,
        allergies: patientData.allergies,
        medications: patientData.medications,
        conditions: patientData.conditions,
        emergencyContacts: patientData.emergencyContacts,
        timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(completeData);
}

// API Service Functions
const api = {
    // Authentication
    register: async (userData) => {
        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(userData)
            });
            return await response.json();
        } catch (error) {
            return { error: "Connection failed: " + error.message };
        }
    },

    login: async (loginData) => {
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(loginData)
            });
            return await response.json();
        } catch (error) {
            return { error: "Connection failed: " + error.message };
        }
    },

    // Emergency
    reportEmergency: async (emergencyData) => {
        try {
            const response = await fetch(`${API_BASE}/emergency/report`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(emergencyData)
            });
            return await response.json();
        } catch (error) {
            return { error: "Connection failed: " + error.message };
        }
    },

    getNearbyHospitals: async (lat, lng) => {
        try {
            const response = await fetch(`${API_BASE}/emergency/hospitals/nearby?lat=${lat}&lng=${lng}`);
            return await response.json();
        } catch (error) {
            return { error: "Connection failed: " + error.message };
        }
    },

    scanPatientQR: async (qrCode) => {
        try {
            const response = await fetch(`${API_BASE}/emergency/patient/qr`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({qrCode})
            });
            return await response.json();
        } catch (error) {
            return { error: "Connection failed: " + error.message };
        }
    },

    getPatientById: async (patientId) => {
        try {
            const response = await fetch(`${API_BASE}/emergency/patient/id`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({patientId})
            });
            return await response.json();
        } catch (error) {
            return { error: "Connection failed: " + error.message };
        }
    },

    // Patient
    getProfile: async () => {
        try {
            const response = await fetch(`${API_BASE}/patient/profile`);
            return await response.json();
        } catch (error) {
            return { error: "Connection failed: " + error.message };
        }
    },

    updateProfile: async (profileData) => {
        try {
            const response = await fetch(`${API_BASE}/patient/profile`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(profileData)
            });
            return await response.json();
        } catch (error) {
            return { error: "Connection failed: " + error.message };
        }
    }
};

// Show/Hide Registration Forms Based on User Type
function showRegistrationForm() {
    const userType = document.getElementById('regUserType').value;
    
    document.getElementById('patientForm').style.display = 'none';
    document.getElementById('doctorForm').style.display = 'none';
    
    if (userType === 'patient') {
        document.getElementById('patientForm').style.display = 'block';
    } else if (userType === 'doctor') {
        document.getElementById('doctorForm').style.display = 'block';
    }
}

// Login Function
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const userType = document.getElementById('userType').value;

    if (!email || !password) {
        alert('Please fill all fields');
        return;
    }

    try {
        const result = await api.login({ email, password, userType });
        
        if (result.message === "Login successful") {
            currentUser = result.user;
            
            showSection('loginSection', false);
            if (userType === 'patient') {
                showSection('patientDashboard', true);
                loadPatientProfile();
            } else {
                showSection('doctorDashboard', true);
            }
            
        } else {
            alert('Login failed: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Register Function
async function register() {
    const userType = document.getElementById('regUserType').value;

    if (userType === 'patient') {
        await registerPatient();
    } else if (userType === 'doctor') {
        await registerDoctor();
    }
}

// Register Patient Function
async function registerPatient() {
    const email = document.getElementById('patientEmail').value;
    const password = document.getElementById('patientPassword').value;
    const fullName = document.getElementById('patientName').value;
    const phone = document.getElementById('patientPhone').value;
    const address = document.getElementById('patientAddress').value;
    const bloodType = document.getElementById('patientBloodType').value;
    const allergies = document.getElementById('patientAllergies').value;
    const medications = document.getElementById('patientMedications').value;
    const conditions = document.getElementById('patientConditions').value;
    const emergencyContactName = document.getElementById('emergencyContactName').value;
    const emergencyContactPhone = document.getElementById('emergencyContactPhone').value;
    const emergencyContactRelation = document.getElementById('emergencyContactRelation').value;

    if (!email || !password || !fullName || !phone) {
        alert('Please fill all required fields (Name, Email, Password, Phone)');
        return;
    }

    try {
        const userData = {
            email,
            password,
            userType: 'patient',
            fullName,
            phone,
            patientData: {
                address: address,
                bloodType: bloodType,
                allergies: allergies.split(',').filter(a => a.trim()),
                medications: medications.split(',').filter(m => m.trim()),
                conditions: conditions.split(',').filter(c => c.trim()),
                emergencyContacts: []
            }
        };

        // Add emergency contact if provided
        if (emergencyContactName && emergencyContactPhone) {
            userData.patientData.emergencyContacts.push({
                name: emergencyContactName,
                phone: emergencyContactPhone,
                relation: emergencyContactRelation || 'Emergency Contact'
            });
        }

        const result = await api.register(userData);
        
        if (result.message === "User registered successfully") {
            alert('Patient registration successful! Please login.');
            showLogin();
        } else {
            alert('Registration failed: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Register Doctor Function
async function registerDoctor() {
    const email = document.getElementById('doctorEmail').value;
    const password = document.getElementById('doctorPassword').value;
    const fullName = document.getElementById('doctorName').value;
    const licenseNumber = document.getElementById('doctorLicense').value;
    const hospital = document.getElementById('doctorHospital').value;
    const department = document.getElementById('doctorDepartment').value;
    const specialization = document.getElementById('doctorSpecialization').value;

    if (!email || !password || !fullName || !licenseNumber) {
        alert('Please fill all required fields (Name, Email, Password, License Number)');
        return;
    }

    try {
        const userData = {
            email,
            password,
            userType: 'doctor',
            fullName,
            phone: 'Not provided',
            staffData: {
                licenseNumber: licenseNumber,
                hospital: hospital,
                department: department,
                specialization: specialization,
                licenseVerified: false,
                accessLevel: 'limited'
            }
        };

        const result = await api.register(userData);
        
        if (result.message === "User registered successfully") {
            alert('Doctor registration successful! Please login.');
            showLogin();
        } else {
            alert('Registration failed: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Load and display patient profile
async function loadPatientProfile() {
    try {
        const result = await api.getProfile();
        if (result.patient) {
            currentUser = result.patient;
            displayProfileData(result.patient);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Display profile data in the dashboard
function displayProfileData(patient) {
    if (document.getElementById('userName')) {
        document.getElementById('userName').textContent = patient.fullName;
    }
    if (document.getElementById('profileName')) {
        document.getElementById('profileName').textContent = patient.fullName;
    }
    if (document.getElementById('profileEmail')) {
        document.getElementById('profileEmail').textContent = patient.email;
    }
    if (document.getElementById('profilePhone')) {
        document.getElementById('profilePhone').textContent = patient.phone;
    }
    
    if (patient.patientData) {
        if (document.getElementById('profileAddress')) {
            document.getElementById('profileAddress').textContent = patient.patientData.address || 'Not provided';
        }
        if (document.getElementById('profileBloodType')) {
            document.getElementById('profileBloodType').textContent = patient.patientData.bloodType || 'Not set';
        }
        if (document.getElementById('profileAllergies')) {
            document.getElementById('profileAllergies').textContent = patient.patientData.allergies?.join(', ') || 'None';
        }
        if (document.getElementById('profileMedications')) {
            document.getElementById('profileMedications').textContent = patient.patientData.medications?.join(', ') || 'None';
        }
        if (document.getElementById('profileConditions')) {
            document.getElementById('profileConditions').textContent = patient.patientData.conditions?.join(', ') || 'None';
        }
        
        // Display emergency contacts
        const emergencyContacts = patient.patientData.emergencyContacts || [];
        let contactsHTML = '';
        emergencyContacts.forEach(contact => {
            contactsHTML += `<div class="contact-item">
                <strong>${contact.name}</strong> (${contact.relation})<br>
                📞 ${contact.phone}
            </div>`;
        });
        if (document.getElementById('profileEmergencyContacts')) {
            document.getElementById('profileEmergencyContacts').innerHTML = contactsHTML || '<p>No emergency contacts added</p>';
        }
        
        // Display QR code and ID
        patientUniqueId = patient.patientData.uniqueId || 'Not generated';
        if (document.getElementById('profileUniqueId')) {
            document.getElementById('profileUniqueId').textContent = patientUniqueId;
        }
    }
}

// Show Edit Profile Form
function showEditProfile() {
    if (currentUser && currentUser.patientData) {
        if (document.getElementById('editName')) {
            document.getElementById('editName').value = currentUser.fullName || '';
        }
        if (document.getElementById('editEmail')) {
            document.getElementById('editEmail').value = currentUser.email || '';
        }
        if (document.getElementById('editPhone')) {
            document.getElementById('editPhone').value = currentUser.phone || '';
        }
        if (document.getElementById('editPassword')) {
            document.getElementById('editPassword').value = '';
        }
        if (document.getElementById('editAddress')) {
            document.getElementById('editAddress').value = currentUser.patientData.address || '';
        }
        if (document.getElementById('editBloodType')) {
            document.getElementById('editBloodType').value = currentUser.patientData.bloodType || '';
        }
        if (document.getElementById('editAllergies')) {
            document.getElementById('editAllergies').value = currentUser.patientData.allergies?.join(', ') || '';
        }
        if (document.getElementById('editMedications')) {
            document.getElementById('editMedications').value = currentUser.patientData.medications?.join(', ') || '';
        }
        if (document.getElementById('editConditions')) {
            document.getElementById('editConditions').value = currentUser.patientData.conditions?.join(', ') || '';
        }
        
        // Fill emergency contacts for editing
        const emergencyContacts = currentUser.patientData.emergencyContacts || [];
        let contactsHTML = '';
        emergencyContacts.forEach((contact, index) => {
            contactsHTML += `
            <div class="emergency-contact-edit" id="contact-${index}">
                <input type="text" value="${contact.name}" placeholder="Contact Name" class="contact-name">
                <input type="tel" value="${contact.phone}" placeholder="Phone Number" class="contact-phone">
                <input type="text" value="${contact.relation}" placeholder="Relationship" class="contact-relation">
                <button type="button" class="btn-remove" onclick="removeEditContact(${index})">Remove</button>
            </div>`;
        });
        if (document.getElementById('editEmergencyContacts')) {
            document.getElementById('editEmergencyContacts').innerHTML = contactsHTML;
        }
    }
    
    showSection('editProfileSection', true);
}

// Add new emergency contact in edit form
function addEmergencyContact() {
    const contactsContainer = document.getElementById('editEmergencyContacts');
    if (!contactsContainer) return;
    
    const newIndex = contactsContainer.children.length;
    const contactDiv = document.createElement('div');
    contactDiv.className = 'emergency-contact-edit';
    contactDiv.id = `contact-${newIndex}`;
    contactDiv.innerHTML = `
        <input type="text" placeholder="Contact Name" class="contact-name">
        <input type="tel" placeholder="Phone Number" class="contact-phone">
        <input type="text" placeholder="Relationship" class="contact-relation">
        <button type="button" class="btn-remove" onclick="removeEditContact(${newIndex})">Remove</button>
    `;
    contactsContainer.appendChild(contactDiv);
}

// Remove emergency contact in edit form
function removeEditContact(index) {
    const contactElement = document.getElementById(`contact-${index}`);
    if (contactElement) {
        contactElement.remove();
    }
}

// Save Profile Function
async function saveProfile() {
    const name = document.getElementById('editName').value;
    const email = document.getElementById('editEmail').value;
    const phone = document.getElementById('editPhone').value;
    const password = document.getElementById('editPassword').value;
    const address = document.getElementById('editAddress').value;
    const bloodType = document.getElementById('editBloodType').value;
    const allergies = document.getElementById('editAllergies').value;
    const medications = document.getElementById('editMedications').value;
    const conditions = document.getElementById('editConditions').value;

    // Collect emergency contacts
    const emergencyContacts = [];
    const contactElements = document.querySelectorAll('.emergency-contact-edit');
    contactElements.forEach(contact => {
        const name = contact.querySelector('.contact-name').value;
        const phone = contact.querySelector('.contact-phone').value;
        const relation = contact.querySelector('.contact-relation').value;
        
        if (name && phone) {
            emergencyContacts.push({
                name: name,
                phone: phone,
                relation: relation || 'Emergency Contact'
            });
        }
    });

    if (!name || !email || !phone) {
        alert('Please fill all required fields (Name, Email, Phone)');
        return;
    }

    try {
        const profileData = {
            fullName: name,
            email: email,
            phone: phone,
            address: address,
            bloodType: bloodType,
            allergies: allergies.split(',').filter(a => a.trim()),
            medications: medications.split(',').filter(m => m.trim()),
            conditions: conditions.split(',').filter(c => c.trim()),
            emergencyContacts: emergencyContacts
        };

        // If password is provided, include it
        if (password) {
            profileData.password = password;
        }

        const result = await api.updateProfile(profileData);
        if (result.message === "Profile updated successfully") {
            alert('Profile updated successfully!');
            loadPatientProfile(); // Reload profile data
            showSection('patientDashboard', true);
        } else {
            alert('Update failed: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Error updating profile: ' + error.message);
    }
}

// Generate Patient QR Code and ID with complete data
function generatePatientQR() {
    if (currentUser && currentUser.patientData) {
        patientUniqueId = currentUser.patientData.uniqueId || 'LK123456789';
        
        // Generate simple QR (for system lookup)
        const simpleQRData = `LIFEKEY:${patientUniqueId}:${currentUser.id}`;
        generateQRCode(simpleQRData, 'patientQRCode');
        
        // Generate complete data QR (contains all medical info)
        const completeQRData = generateCompleteDataQR(currentUser.patientData);
        generateQRCode(completeQRData, 'qrCodeDisplay');
        generateQRCode(completeQRData, 'completeDataQR');
        
        if (document.getElementById('patientUniqueId')) {
            document.getElementById('patientUniqueId').textContent = patientUniqueId;
        }
        if (document.getElementById('uniqueIdDisplay')) {
            document.getElementById('uniqueIdDisplay').textContent = patientUniqueId;
        }
        if (document.getElementById('completeDataId')) {
            document.getElementById('completeDataId').textContent = patientUniqueId;
        }
        
        // Display complete data for preview
        displayCompleteDataPreview();
    } else {
        alert('Please complete your medical profile first to generate QR codes.');
        showEditProfile();
    }
}

// Display complete data that will be in QR
function displayCompleteDataPreview() {
    if (currentUser && currentUser.patientData) {
        const previewElement = document.getElementById('completeDataPreview');
        if (previewElement) {
            const data = {
                name: currentUser.fullName,
                phone: currentUser.phone,
                bloodType: currentUser.patientData.bloodType,
                allergies: currentUser.patientData.allergies,
                medications: currentUser.patientData.medications,
                conditions: currentUser.patientData.conditions,
                emergencyContacts: currentUser.patientData.emergencyContacts
            };
            previewElement.textContent = JSON.stringify(data, null, 2);
        }
    }
}

// Show QR Generator Section
function showQRGenerator() {
    if (currentUser && currentUser.patientData) {
        generatePatientQR();
        showSection('qrGeneratorSection', true);
    } else {
        alert('Please complete your medical profile first.');
        showEditProfile();
    }
}

// Show Complete Data QR Section
function showCompleteDataQR() {
    if (currentUser && currentUser.patientData) {
        generatePatientQR();
        showSection('completeDataQRSection', true);
    } else {
        alert('Please complete your medical profile first.');
        showEditProfile();
    }
}

// Download QR Code
function downloadQRCode() {
    const canvas = document.querySelector('#qrCodeDisplay canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = `lifekey-qr-${patientUniqueId}.png`;
        link.href = canvas.toDataURL();
        link.click();
    } else {
        alert('QR code not generated yet. Please generate QR code first.');
    }
}

// Download Complete Data QR
function downloadCompleteDataQR() {
    const canvas = document.querySelector('#completeDataQR canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = `lifekey-complete-data-${patientUniqueId}.png`;
        link.href = canvas.toDataURL();
        link.click();
    } else {
        alert('Complete data QR not generated yet.');
    }
}

// Copy ID to clipboard
function copyPatientId() {
    const idText = document.getElementById('uniqueIdDisplay').textContent;
    navigator.clipboard.writeText(idText).then(() => {
        alert('Patient ID copied to clipboard!');
    }).catch(() => {
        alert('Failed to copy ID. Please copy manually: ' + idText);
    });
}

// Copy Complete Data ID
function copyCompleteDataId() {
    const idText = document.getElementById('completeDataId').textContent;
    navigator.clipboard.writeText(idText).then(() => {
        alert('Patient ID copied to clipboard!');
    }).catch(() => {
        alert('Failed to copy ID. Please copy manually: ' + idText);
    });
}

// Doctor Functions
function showQRScanner() {
    showSection('doctorQRScanner', true);
}

function showPatientIdInput() {
    showSection('doctorPatientId', true);
}

function showFaceScanner() {
    alert('Face scanning feature will be implemented in the next version. For demo, this would use mobile camera for facial recognition.');
}

// Scan QR Code
function startQRScan() {
    alert('QR Scanner activated! Point your camera at a patient QR code.\n\nFor demo purposes, you can enter this QR data manually: LIFEKEY:LK123456789:patient_123');
    
    // Simulate QR scan for demo
    setTimeout(() => {
        const qrData = 'LIFEKEY:LK123456789:patient_123';
        processScannedQR(qrData);
    }, 2000);
}

function processScannedQR(qrData) {
    // Extract patient ID from QR data
    const parts = qrData.split(':');
    if (parts.length >= 3 && parts[0] === 'LIFEKEY') {
        const patientId = parts[1]; // The unique ID
        getPatientInfo(patientId, 'qr');
    } else {
        // Try to parse as complete data QR
        try {
            const completeData = JSON.parse(qrData);
            if (completeData.type === "LIFEKEY_MEDICAL_RECORD") {
                displayCompleteDataFromQR(completeData);
                return;
            }
        } catch (e) {
            // Not JSON, continue with error
        }
        alert('Invalid QR code format. Please try scanning a valid LifeKey QR code.');
    }
}

// Display complete data from QR (when doctor scans complete data QR)
function displayCompleteDataFromQR(completeData) {
    showSection('doctorPatientInfo', true);
    
    if (document.getElementById('patientInfoName')) {
        document.getElementById('patientInfoName').textContent = completeData.name;
    }
    if (document.getElementById('patientInfoPhone')) {
        document.getElementById('patientInfoPhone').textContent = completeData.phone;
    }
    if (document.getElementById('patientInfoEmail')) {
        document.getElementById('patientInfoEmail').textContent = 'From QR Code';
    }
    if (document.getElementById('patientInfoAddress')) {
        document.getElementById('patientInfoAddress').textContent = 'From QR Code';
    }
    if (document.getElementById('patientInfoBloodType')) {
        document.getElementById('patientInfoBloodType').textContent = completeData.bloodType || 'Not set';
    }
    if (document.getElementById('patientInfoAllergies')) {
        document.getElementById('patientInfoAllergies').textContent = completeData.allergies?.join(', ') || 'None';
    }
    if (document.getElementById('patientInfoMedications')) {
        document.getElementById('patientInfoMedications').textContent = completeData.medications?.join(', ') || 'None';
    }
    if (document.getElementById('patientInfoConditions')) {
        document.getElementById('patientInfoConditions').textContent = completeData.conditions?.join(', ') || 'None';
    }
    if (document.getElementById('patientInfoUniqueId')) {
        document.getElementById('patientInfoUniqueId').textContent = completeData.patientId || 'From QR Code';
    }
    
    // Display emergency contacts
    const emergencyContacts = completeData.emergencyContacts || [];
    let contactsHTML = '';
    emergencyContacts.forEach(contact => {
        contactsHTML += `<p><strong>${contact.name}</strong> (${contact.relation}): ${contact.phone}</p>`;
    });
    if (document.getElementById('patientInfoEmergencyContacts')) {
        document.getElementById('patientInfoEmergencyContacts').innerHTML = contactsHTML || '<p>No emergency contacts</p>';
    }
    
    alert('✅ Complete medical data loaded directly from QR code!');
}

// Get patient by ID
async function getPatientById() {
    const patientId = document.getElementById('patientIdInput').value.trim();
    if (!patientId) {
        alert('Please enter a patient ID');
        return;
    }
    
    await getPatientInfo(patientId, 'id');
}

// Get patient information
async function getPatientInfo(patientId, source) {
    try {
        let result;
        if (source === 'qr') {
            result = await api.scanPatientQR(patientId);
        } else {
            result = await api.getPatientById(patientId);
        }
        
        if (result.error) {
            alert('Error: ' + result.error);
            return;
        }
        
        if (result.patient) {
            displayPatientInfo(result.patient);
            showSection('doctorPatientInfo', true);
        } else {
            alert('Patient not found with the provided ' + (source === 'qr' ? 'QR code' : 'ID'));
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Display patient information for doctors
function displayPatientInfo(patient) {
    if (document.getElementById('patientInfoName')) {
        document.getElementById('patientInfoName').textContent = patient.fullName;
    }
    if (document.getElementById('patientInfoPhone')) {
        document.getElementById('patientInfoPhone').textContent = patient.phone;
    }
    if (document.getElementById('patientInfoEmail')) {
        document.getElementById('patientInfoEmail').textContent = patient.email;
    }
    
    if (patient.patientData) {
        if (document.getElementById('patientInfoAddress')) {
            document.getElementById('patientInfoAddress').textContent = patient.patientData.address || 'Not provided';
        }
        if (document.getElementById('patientInfoBloodType')) {
            document.getElementById('patientInfoBloodType').textContent = patient.patientData.bloodType || 'Not set';
        }
        if (document.getElementById('patientInfoAllergies')) {
            document.getElementById('patientInfoAllergies').textContent = patient.patientData.allergies?.join(', ') || 'None';
        }
        if (document.getElementById('patientInfoMedications')) {
            document.getElementById('patientInfoMedications').textContent = patient.patientData.medications?.join(', ') || 'None';
        }
        if (document.getElementById('patientInfoConditions')) {
            document.getElementById('patientInfoConditions').textContent = patient.patientData.conditions?.join(', ') || 'None';
        }
        if (document.getElementById('patientInfoUniqueId')) {
            document.getElementById('patientInfoUniqueId').textContent = patient.patientData.uniqueId || 'Not generated';
        }
        
        // Display emergency contacts
        const emergencyContacts = patient.patientData.emergencyContacts || [];
        let contactsHTML = '';
        emergencyContacts.forEach(contact => {
            contactsHTML += `<p><strong>${contact.name}</strong> (${contact.relation}): ${contact.phone}</p>`;
        });
        if (document.getElementById('patientInfoEmergencyContacts')) {
            document.getElementById('patientInfoEmergencyContacts').innerHTML = contactsHTML || '<p>No emergency contacts</p>';
        }
    }
}

// Hospital Functions
async function findNearbyHospitals() {
    try {
        // Mock location for demo (New York coordinates)
        const location = { lat: 40.7128, lng: -74.0060 };
        const hospitals = await api.getNearbyHospitals(location.lat, location.lng);
        
        if (hospitals.error) {
            alert('Error: ' + hospitals.error);
            return;
        }
        
        hospitalsData = hospitals;
        displayHospitals(hospitals);
        showSection('hospitalsSection', true);
        
    } catch (error) {
        alert('Error finding hospitals: ' + error.message);
    }
}

function displayHospitals(hospitals) {
    const hospitalsList = document.getElementById('hospitalsList');
    if (!hospitalsList) return;
    
    hospitalsList.innerHTML = '';

    hospitals.forEach(hospital => {
        const hospitalCard = document.createElement('div');
        hospitalCard.className = 'hospital-card';
        hospitalCard.innerHTML = `
            <h3>🏥 ${hospital.name}</h3>
            <p><strong>Address:</strong> ${hospital.location.address}</p>
            <p><strong>Distance:</strong> ${hospital.distance}</p>
            <p><strong>Emergency Phone:</strong> ${hospital.emergencyPhone}</p>
            <p><strong>General Phone:</strong> ${hospital.generalPhone || 'N/A'}</p>
            <p><strong>Departments:</strong> ${hospital.departments.join(', ')}</p>
            <div class="hospital-actions">
                <button class="btn-call" onclick="callHospital('${hospital.emergencyPhone}')">📞 Call Emergency</button>
                ${hospital.generalPhone ? `<button class="btn-call secondary" onclick="callHospital('${hospital.generalPhone}')">📞 Call General</button>` : ''}
                <button class="btn-direction" onclick="showDirections('${hospital.location.lat}', '${hospital.location.lng}')">📍 Get Directions</button>
            </div>
        `;
        hospitalsList.appendChild(hospitalCard);
    });
}

function callHospital(phoneNumber) {
    if (confirm(`Call ${phoneNumber}?`)) {
        window.open(`tel:${phoneNumber}`);
    }
}

function showDirections(lat, lng) {
    alert(`Directions to hospital:\n\nFor demo, this would open maps with coordinates:\nLatitude: ${lat}\nLongitude: ${lng}\n\nIn production, this would open Google Maps or Apple Maps.`);
}

// Emergency Functions
async function reportEmergency() {
    try {
        // Mock location for demo
        const location = { lat: 40.7128, lng: -74.0060 };
        
        const result = await api.reportEmergency({
            location: location,
            emergencyType: "unconscious_person",
            description: "Citizen reported unconscious person at location"
        });
        
        if (result.message) {
            alert('🚨 EMERGENCY REPORTED!\n\n' + result.message + '\n\nEmergency services have been notified and help is on the way.');
        } else {
            alert('Error: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Error reporting emergency: ' + error.message);
    }
}

// UI Navigation Functions
function showSection(sectionId, show) {
    const sections = [
        'loginSection', 'registerSection', 'patientDashboard', 'doctorDashboard',
        'editProfileSection', 'hospitalsSection', 'qrGeneratorSection', 'completeDataQRSection',
        'doctorQRScanner', 'doctorPatientId', 'doctorPatientInfo'
    ];
    
    sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    if (show) {
        const element = document.getElementById(sectionId);
        if (element) {
            element.style.display = 'block';
        }
    }
}

function showLogin() {
    showSection('loginSection', true);
}

function showRegister() {
    showSection('registerSection', true);
    showRegistrationForm();
}

function showPatientDashboard() {
    showSection('patientDashboard', true);
}

function showDoctorDashboard() {
    showSection('doctorDashboard', true);
}

function logout() {
    currentUser = null;
    hospitalsData = [];
    showSection('loginSection', true);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded - showing login section');
    showSection('loginSection', true);
    
    // Load QRCode.js library dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
    script.onload = function() {
        console.log('QRCode library loaded');
    };
    script.onerror = function() {
        console.log('QRCode library failed to load');
    };
    document.head.appendChild(script);
});