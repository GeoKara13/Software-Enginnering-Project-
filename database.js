const sqlite3 = require('sqlite3').verbose();

  //try to connect to database,it have 2 probably entry
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected successfully to the SQLite database.');
    }
});


db.serialize(() => {
    // All tables create according to Database ER diagram
    db.run(`CREATE TABLE IF NOT EXISTS User (
        UserID INTEGER PRIMARY KEY AUTOINCREMENT,
        UserName VARCHAR(255) NOT NULL,
        Email VARCHAR(255) NOT NULL UNIQUE,
        Password VARCHAR(255) NOT NULL,
        Phone VARCHAR(255) UNIQUE,
        DateOfBirth DATE
    )`);

    
    db.run(`CREATE TABLE IF NOT EXISTS Property (
        PropertyID INTEGER PRIMARY KEY AUTOINCREMENT,
        OwnerID INTEGER NOT NULL,
        PropertyType VARCHAR(50) NOT NULL,
        SqMeters INTEGER NOT NULL,
        Price DECIMAL(12,2) NOT NULL,
        PropertyStatus VARCHAR(255) NOT NULL,
        YearOfManufacture INTEGER,
        Bedrooms INTEGER,
        Description TEXT,
        FOREIGN KEY (OwnerID) REFERENCES User(UserID)
    )`);

    
    db.run(`CREATE TABLE IF NOT EXISTS Appointment (
        AppointmentID INTEGER PRIMARY KEY AUTOINCREMENT,
        ClientID INTEGER NOT NULL,
        PropertyID INTEGER NOT NULL,
        AppDate DATE NOT NULL,
        AppTime TIME NOT NULL,
        Status VARCHAR(255) NOT NULL,
        FOREIGN KEY (ClientID) REFERENCES User(UserID),
        FOREIGN KEY (PropertyID) REFERENCES Property(PropertyID)
    )`);

    
    db.run(`CREATE TABLE IF NOT EXISTS PropertyImage (
        ImageID INTEGER PRIMARY KEY AUTOINCREMENT,
        PropertyID INTEGER NOT NULL,
        ImageUrl VARCHAR(255) NOT NULL,
        FOREIGN KEY (PropertyID) REFERENCES Property(PropertyID)
    )`);
});

module.exports = db;