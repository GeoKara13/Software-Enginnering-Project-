const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database'); 


const multer = require('multer');
const path = require('path');
const fs = require('fs');


if (!fs.existsSync('./uploads')){
    fs.mkdirSync('./uploads');
}


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});
const upload = multer({ storage: storage });


const JWT_SECRET = "super_secret_homerental_key_2026!";

const app = express();


app.use(cors()); 
app.use(express.json()); 
app.use('/uploads', express.static('uploads')); 


const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Invalid or expired token." });
        }
        req.user = user;
        next(); 
    });
};


app.post('/api/users/register', async (req, res) => {
    const { UserName, Email, Password, Phone, DateOfBirth } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(Password, 10);
        const sql = `INSERT INTO User (UserName, Email, Password, Phone, DateOfBirth) 
                     VALUES (?, ?, ?, ?, ?)`;
        
        db.run(sql, [UserName, Email, hashedPassword, Phone, DateOfBirth], function(err) {
            if (err) {
                return res.status(400).json({ error: "Email or phone number already exists!" });
            }
            res.status(201).json({ 
                message: "User created successfully!", 
                userID: this.lastID 
            });
        });
    } catch (error) {
        res.status(500).json({ error: "Internal server error." });
    }
});


app.post('/api/appointments', authenticateToken, (req, res) => {
    const ClientID = req.user.id;
    const { PropertyID, AppDate, AppTime } = req.body;
    const defaultStatus = 'Pending';

    const sql = `INSERT INTO Appointment (ClientID, PropertyID, AppDate, AppTime, Status) 
                 VALUES (?, ?, ?, ?, ?)`;

    db.run(sql, [ClientID, PropertyID, AppDate, AppTime, defaultStatus], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(400).json({ error: "Failed to create appointment." });
        }
        res.status(201).json({ 
            message: "Appointment successfully booked!",
            appointmentID: this.lastID 
        });
    });
});


app.post('/api/properties', authenticateToken, (req, res) => {
    
    const OwnerID = req.user.id;
    const { PropertyType, SqMeters, Price, PropertyStatus, YearOfManufacture, Bedrooms, Description } = req.body;

    const sql = `INSERT INTO Property (OwnerID, PropertyType, SqMeters, Price, PropertyStatus, YearOfManufacture, Bedrooms, Description) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [OwnerID, PropertyType, SqMeters, Price, PropertyStatus, YearOfManufacture, Bedrooms, Description], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(400).json({ error: "Failed to create property." });
        }
        res.status(201).json({ 
            message: "Property created successfully!", 
            propertyID: this.lastID 
        });
    });
});


app.get('/api/properties', (req, res) => {
    const sql = `SELECT * FROM Property`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "Failed to fetch properties." });
        }
        res.status(200).json({ properties: rows });
    });
});


app.get('/api/users/appointments', authenticateToken, (req, res) => {

    const clientId = req.user.id; 
    const sql = `SELECT * FROM Appointment WHERE ClientID = ?`;
    
    db.all(sql, [clientId], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "Failed to fetch appointments." });
        }
        res.status(200).json({ appointments: rows });
    });
});


app.post('/api/users/login', (req, res) => {
    const { Email, Password } = req.body;
    const sql = `SELECT * FROM User WHERE Email = ?`;

    db.get(sql, [Email], async (err, user) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "Internal server error during login." });
        }
        
        
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        
        const isPasswordValid = await bcrypt.compare(Password, user.Password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid password." });
        }

        
        const token = jwt.sign(
            { id: user.UserID, email: user.Email }, 
            JWT_SECRET, 
            { expiresIn: '2h' }
        );

        res.status(200).json({
            message: "Login successful!",
            token: token,
            user: {
                UserID: user.UserID,
                UserName: user.UserName,
                Email: user.Email
            }
        });
    });
});


app.delete('/api/appointments/:id', authenticateToken, (req, res) => {
    const appointmentId = req.params.id; 
    const clientId = req.user.id; 

    const sql = `DELETE FROM Appointment WHERE AppointmentID = ? AND ClientID = ?`;

    db.run(sql, [appointmentId, clientId], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "Error during deletion." });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Appointment not found or you don't have permission to delete it." });
        }
        res.status(200).json({ message: "Appointment successfully cancelled!" });
    });
});


app.post('/api/properties/:id/upload', authenticateToken, upload.single('image'), (req, res) => {
    const propertyId = req.params.id;

    if (!req.file) {
        return res.status(400).json({ error: "Please select an image." });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const sql = `INSERT INTO PropertyImage (PropertyID, ImageUrl) VALUES (?, ?)`;
    
    db.run(sql, [propertyId, imageUrl], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "Failed to save the image to the database." });
        }
        res.status(201).json({ 
            message: "Image successfully uploaded!",
            imageUrl: imageUrl
        });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});