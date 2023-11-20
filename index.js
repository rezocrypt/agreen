// Import the express module
const fs = require('fs');
const crypto = require('crypto');
const QRCode = require('qrcode');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fileupload = require("express-fileupload");

const domain = "https://agreeen.onrender.com"

const staff_username = "kali"
const staff_password_hash = "3aeffb032a51d224814e7c8d876ec433aae4ad44cd6362dc26b6b9cb750c7620"

function generate_qr(id) {
    QRCode.toFile('db/qr/' + id + ".png", 'http://' + domain + '/seeplant/' + id, {
        errorCorrectionLevel: 'H'
    }, function (err) {
        if (err) throw err;
        console.log('QR code saved!');
    });
}

function get_sha3_256(data) {
    const sha3Hash = crypto.createHash('sha3-256');
    sha3Hash.update(data);
    const result = sha3Hash.digest('hex');
    return result
}


// Create an Express application
const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Middleware to parse incoming request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/photos', express.static('photos'));
app.use(fileupload());

// Middleware for session management
app.use(session({
    secret: 'your-secret-key', // Change this to a strong, random key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Define a route for the root path
app.get('/', (req, res) => {
    res.redirect("/home")
});





// Staff routes

app.get('/staff', (req, res) => {
    if (req.session.username !== staff_username || req.session.password_hash !== staff_password_hash) {
        res.redirect("/staff/login");
        return true;
    }
    res.render("staff.ejs")
});

app.get('/staff/logout', (req, res) => {
    req.session.username = "";
    req.session.password_hash = "";
    res.redirect("/staff")
});

app.get('/staff/login', (req, res) => {
    if (req.session.username === staff_username && req.session.password_hash === staff_password_hash) {
        res.redirect("/staff");
        return true;
    }
    const false_login = false;
    res.render("staff_login.ejs", { false_login })
});

function check_staff_login(username, password) {
    const password_hash = get_sha3_256(password)
    if (username === staff_username && password_hash === staff_password_hash) {
        return true;
    }
    return false;
}

app.post('/staff/login', (req, res) => {
    const { username, password } = req.body;
    const password_hash = get_sha3_256(password);
    if (check_staff_login(username, password) === true) {
        req.session.username = username;
        req.session.password_hash = password_hash;
        res.redirect("/staff")
    }
    else {
        let false_login = true;
        res.render("staff_login.ejs", { false_login })
    }

});

function generate_random_hash() {
    const randomNumber = Math.random();
    const randomString = randomNumber.toString();
    const hash = crypto.createHash('md5');
    hash.update(randomString);
    const hashedValue = hash.digest('hex');
    return hashedValue;
}







// Plant routes

app.get('/staff/createplanttype', (req, res) => {
    if (req.session.username !== staff_username || req.session.password_hash !== staff_password_hash) {
        res.redirect("/staff/login");
        return true;
    }
    const just_added = false;
    res.render("createplanttype.ejs", { just_added })
});

app.get('/staff/addplant', (req, res) => {
    if (req.session.username !== staff_username || req.session.password_hash !== staff_password_hash) {
        res.redirect("/staff/login");
        return true;
    }
    let plant_types = JSON.parse(fs.readFileSync(process.cwd() + "/db/plant_types.json"))["types"]
    let just_added = false
    res.render("addplant.ejs", { plant_types, just_added })
});

app.post('/staff/addplant', (req, res) => {
    if (req.session.username !== staff_username || req.session.password_hash !== staff_password_hash) {
        res.redirect("/staff/login");
        return true;
    }
    let plants = JSON.parse(fs.readFileSync(process.cwd() + "/db/plants.json"))
    const id = generate_random_hash();
    plant_data = {
        "type": req.body.type,
        "status": req.body.status,
        "location": req.body.location,
        "description": req.body.description,
        "plantation_year": req.body.plantation_year,
    }
    console.log(req.body.location, " is location");

    const destinationPath = 'photos/' + id + ".png";

    if (req.files === null) {
        fs.copyFileSync("photos/default.png", destinationPath)
    }
    else {
        req.files.plant_photo.mv(destinationPath, (err) => { });
    }
    console.log("FILES ARE ", req.files);
    plants["plants"][id] = plant_data;
    fs.writeFileSync(process.cwd() + "/db/plants.json", JSON.stringify(plants))
    let plant_types = JSON.parse(fs.readFileSync(process.cwd() + "/db/plant_types.json"))["types"]
    console.log(process.cwd() + '/db/qr/' + id + ".png");
    generate_qr(id);
    let just_added = true
    res.render("addplant.ejs", { plant_types, just_added, id })
});

app.post('/staff/createplanttype', (req, res) => {
    if (req.session.username !== staff_username || req.session.password_hash !== staff_password_hash) {
        res.redirect("/staff/login");
        return true;
    }
    let data = JSON.parse(fs.readFileSync(process.cwd() + "/db/plant_types.json"))
    if (data["types"][req.body.name] === undefined) {
        data["types"][req.body.name] = {
            "description": req.body.description
        }
        fs.writeFileSync(process.cwd() + "/db/plant_types.json", JSON.stringify(data))
    }
    const just_added = true;
    res.render("createplanttype.ejs", { just_added })
});

app.get('/seeplant/:id', (req, res, next) => {
    const id = req.params.id;
    console.log(id);
    let plants = JSON.parse(fs.readFileSync(process.cwd() + "/db/plants.json"))
    let plant_data = plants["plants"][id]
    res.render("seeplant.ejs", { plant_data, id })
})

app.get('/allplants', (req, res) => {
    let plants = JSON.parse(fs.readFileSync(process.cwd() + "/db/plants.json"))["plants"]
    res.render("allplants.ejs", { plants })
});

app.get('/home', (req, res) => {
    res.render("home.ejs")
});

app.get('/downloadqr/:id', (req, res, next) => {
    const id = req.params.id;
    res.setHeader('Content-Disposition', `attachment; filename=${id}.png`);
    res.sendFile(process.cwd() + '/db/qr/' + id + ".png")
})

app.get('/plantsmap', (req, res) => {
    let plants_data = JSON.parse(fs.readFileSync(process.cwd() + "/db/plants.json"))["plants"]
    console.log(plants_data);
    res.render("plantsmap.ejs", { plants_data })
});



// Set the server to listen on port 80
const port = 80;
app.listen(port, () => {
    console.log(`Server is listening on http://localhost:${port}`);
});
