const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const fs2 = require('fs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

const app = express();
require('dotenv').config();

const PORT = 5500;
const PASS_KEY = process.env.PASS_KEY;
const ADMIN_ID = process.env.ADMIN_ID;
const RAPIDAPI_KEY = process.env.API_KEY;
const RAPIDAPI_HOST = 'travel-advisor.p.rapidapi.com';
const options = {
    method: 'GET',
    headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
    }
};

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/TripRide")
    .then(() => console.log("Connected to DB"))
    .catch(err => console.error("DB connection error:", err));

// Middlewares
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// User model
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String
});
const User = mongoose.model("User", userSchema);

// middleware for authentication
const isAuthenticated = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.render('login', { message: 'Please log in to continue.' });
    }
    else {
        try {
            const decoded = jwt.verify(token, PASS_KEY);
            req.user = decoded._id; 
            next();
        } catch (err) {
            return res.render('login', { message: 'Invalid token. Please log in again.' });
        }
    }
};

// login
app.get('/login', (req, res) => {
    res.render('login', { message: '' })
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).render('login', { message: 'User not found! Please Sign Up!' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).render('login', { message: 'Invalid email or password' });
        }
        const token = jwt.sign({ _id: user._id }, PASS_KEY, { expiresIn: '30m' });
        res.cookie("token", token, {
            httpOnly: true,
            expires: new Date(Date.now() + 30 * 60 * 1000)
        });
        res.redirect('/');
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).send("Internal Server Error");
    }
});

// signup
app.get('/signup', (req, res) => {
    res.render('signup', { message: '' })
})


app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).render('signup', { message: 'Email is already registered! Please Log In!' });
        }
        var saltRounds = 10
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
        });
        const token = jwt.sign({ _id: user._id }, PASS_KEY, { expiresIn: '30m' });
        res.cookie("token", token, {
            httpOnly: true,
            expires: new Date(Date.now() + 30 * 60 * 1000),
        });
        res.redirect('/');
    } catch (error) {
        console.error("Error during signup:", error);
        res.status(500).send("Internal Server Error");
    }
});

// logout
app.get('/logout', isAuthenticated, (req, res) => {
    res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
    res.redirect('/');
});

// Path to JSON files
const packagesFilePath = path.join(__dirname, 'public/package/data/packages.json');
const wishlistData = path.join(__dirname, 'public/package/data/wishlist.json');

// functions for reading and writing JSON files
async function readPackagesFromFile() {
    try {
        const data = await fs.readFile(packagesFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        throw err;
    }
}

async function writePackagesToFile(packages) {
    try {
        await fs.writeFileSync(packagesFilePath, JSON.stringify(packages, null, 2));
    } catch (err) {
        throw err;
    }
}

// home
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// about
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/about.html'));
});

// homepage of packages
app.get('/pkg-home', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/package/home.html'));
});

// packages category-wise (from explore the world button)
app.get('/tphome', async (req, res) => {
    res.sendFile(path.join(__dirname, 'public/package/tphome.html'));
});

// live-location route
app.get('/liveloc_data', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/liveloc_data.html'));
});

// Admin route
app.get('/admin', async (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/admin.html'));
});

app.post('/admin-check', (req, res) => {
    const { adminId } = req.body;
    if (adminId === ADMIN_ID) {
        res.json({ valid: true });
    } else {
        res.json({ valid: false });
    }
});

// Package routes
app.get('/packages', async (req, res) => {
    try {
        const packages = await readPackagesFromFile();
        res.json(packages);
    } catch (error) {
        res.status(500).json({ error: 'Error reading package data' });
    }
});

app.post('/packages', async (req, res) => {
    try {
        const packages = await readPackagesFromFile();
        const newPackage = { ...req.body, id: packages.length + 1 };
        packages.push(newPackage);
        await writePackagesToFile(packages);
        res.status(201).json(newPackage);
    } catch (error) {
        res.status(500).json({ error: 'Error adding new package' });
    }
});

app.put('/packages/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        const packages = await readPackagesFromFile();
        const index = packages.findIndex(p => p.id === id);
        if (index !== -1) {
            packages[index] = { ...req.body, id };
            await writePackagesToFile(packages);
            res.json(packages[index]);
        } else {
            res.status(404).json({ error: 'Package not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error updating package' });
    }
});

app.delete('/packages/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        let packages = await readPackagesFromFile();
        const updatedPackages = packages.filter(p => p.id !== id);
        if (packages.length === updatedPackages.length) {
            return res.status(404).json({ error: 'Package not found' });
        }
        await writePackagesToFile(updatedPackages);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Error deleting package' });
    }
});

// Wishlist routes using authenticated user's email
app.post('/wishlist', isAuthenticated, (req, res) => {
    const userEmail = req.user; // Get user email from authentication middleware
    const { packageId } = req.body;

    fs2.readFile(wishlistData, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error reading wishlist data.');
        }

        let wishlist = JSON.parse(data);
        if (!wishlist[userEmail]) wishlist[userEmail] = [];
        if (!wishlist[userEmail].includes(packageId)) wishlist[userEmail].push(packageId);

        fs2.writeFile(wishlistData, JSON.stringify(wishlist, null, 2), (err) => {
            if (err) {
                return res.status(500).send('Error updating wishlist.');
            }
            res.status(200).send('Package added to wishlist.');
        });
    });
});

// Wishlist routes
app.get('/wishlist', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/package/wishlist.html'));
});

// API endpoint to return the wishlist JSON data
app.get('/api/wishlist', isAuthenticated, (req, res) => {
    const userEmail = req.user;
    fs2.readFile(wishlistData, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error reading wishlist data.');
        }
        const wishlist = JSON.parse(data);
        const userWishlist = wishlist[userEmail] || [];
        fs2.readFile(packagesFilePath, 'utf8', (err, packages) => {
            if (err) {
                return res.status(500).send('Error reading packages data.');
            }

            const packagesList = JSON.parse(packages);
            const favPackages = packagesList.filter(pkg => userWishlist.includes(pkg.id));
            res.json(favPackages);
        });
    });
});

app.delete('/wishlist/:packageId', isAuthenticated, (req, res) => {
    const userEmail = req.user;
    const packageId = parseInt(req.params.packageId, 10);

    fs2.readFile(wishlistData, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error reading wishlist data.');
        }
        let wishlist = JSON.parse(data);
        if (wishlist[userEmail]) {
            wishlist[userEmail] = wishlist[userEmail].filter(id => id !== packageId);
            if (wishlist[userEmail].length === 0) delete wishlist[userEmail];
            fs2.writeFile(wishlistData, JSON.stringify(wishlist, null, 2), (err) => {
                if (err) {
                    return res.status(500).send('Error updating wishlist.');
                }
                res.status(200).json({ message: 'Package removed from wishlist' });
            });
        } else {
            res.status(404).send('User not found or wishlist is empty.');
        }
    });
});

app.get('/toppkg', (req, res) => {
    const jsonFilePath = path.join(__dirname, 'public/package/data/toppkg.json');

    fs2.readFile(jsonFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading JSON file:', err);
            res.status(500).send('Error reading the JSON file');
        } else {
            try {
                const jsonData = JSON.parse(data);
                res.json(jsonData);
            } catch (parseError) {
                console.error('Error parsing JSON file:', parseError);
                res.status(500).send('Error parsing JSON file');
            }
        }
    });
});

// API routes for fetching data from RapidAPI
app.get('/cities', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/cityDetail.html'));
});

app.get('/attractions', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/attractions.html'));
});

app.get('/hotels', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/hotels.html'));
});

app.get('/restaurants', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/restaurants.html'));
});

// attractions API
app.get('/api/attractions', async (req, res) => {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
        return res.status(400).send('Latitude and longitude are required');
    }
    const url = `https://${RAPIDAPI_HOST}/attractions/list-by-latlng?latitude=${latitude}&longitude=${longitude}`;
    try {
        const response = await axios.get(url, options);
        const attractions = response.data.data;
        res.json(attractions);
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
});

// Hotels API
app.get('/api/hotels', async (req, res) => {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
        return res.status(400).send('Latitude and longitude are required');
    }
    const currentTimestamp = Date.now();
    const checkinTimestamp = currentTimestamp + 30 * 24 * 60 * 60 * 1000;
    const checkoutTimestamp = currentTimestamp + 32 * 24 * 60 * 60 * 1000;

    const checkinDate = new Date(checkinTimestamp);
    const checkoutDate = new Date(checkoutTimestamp);

    const formattedCheckinDate = checkinDate.toISOString().split('T')[0];
    const formattedCheckoutDate = checkoutDate.toISOString().split('T')[0];

    const options = {
        method: 'GET',
        url: 'https://booking-com.p.rapidapi.com/v2/hotels/search-by-coordinates',
        params: {
            children_number: '2',
            room_number: '1',
            checkout_date: formattedCheckoutDate,
            locale: 'en-us',
            units: 'metric',
            checkin_date: formattedCheckinDate,
            include_adjacency: 'true',
            filter_by_currency: 'INR',
            children_ages: '5,0',
            longitude: longitude,
            latitude: latitude,
            adults_number: '2',
            order_by: 'popularity'
        },
        headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': 'booking-com.p.rapidapi.com'
        }
    };
    try {
        const response = await axios.request(options);
        // console.log(response.data);
        res.json(response.data);
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
});

// Restaurants API
app.get('/api/restaurants', async (req, res) => {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
        return res.status(400).send('Latitude and longitude are required');
    }
    const url = `https://${RAPIDAPI_HOST}/restaurants/list-by-latlng?latitude=${latitude}&longitude=${longitude}`;
    try {
        const response = await axios.get(url, options);
        const restaurants = response.data.data;
        res.json(restaurants);
    } catch (error) {
        res.status(500).send('Error fetching restaurants');
    }
});

// search API
app.get('/api/search', async (req, res) => {
    const query = req.query.query;
    const offset = req.query.offset;
    // console.log(query);
    const options = {
        method: 'GET',
        url: `https://travel-advisor.p.rapidapi.com/locations/search?query=${query}&offset=${offset}`,
        headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        }
    };
    try {
        const response = await axios.request(options);
        res.json(response.data);
    } catch (error) {
        console.error(error);
    }
});

// Autocomplete API
app.get('/api/autocomplete', async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).send('Query parameter is required');
    }
    const url = `https://${RAPIDAPI_HOST}/locations/auto-complete?query=${query}&lang=en_US&units=km`;
    try {
        const response = await axios.get(url, options);
        const suggestions = response.data.data;
        res.json(suggestions);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error fetching autocomplete data');
    }
});

// blog routes
const blogFile = path.join(__dirname, 'public/blogs.json');
app.use(bodyParser.json());

app.get('/blog', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/blog.html'));
})

// Function to read blogs from JSON file
const readBlogs = async () => {
    try {
        const data = await fs.readFile(blogFile, 'utf8');
        // console.log(JSON.parse(data));
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading file:', err);
        throw err;
    }
};

// Function to write blogs to JSON file
const writeBlogs = async (blogs) => {
    try {
        await fs.writeFile(blogFile, JSON.stringify(blogs), 'utf8');
    } catch (err) {
        console.error('Error writing file:', err);
        throw err;
    }
};

app.get('/api/blogs', async (req, res) => {
    try {
        const blogs = await readBlogs();
        res.json(blogs);
    } catch (err) {
        res.status(500).send('Error reading blog file');
    }
});

app.post('/api/blogs', async (req, res) => {
    const newBlog = req.body;
    try {
        const blogs = await readBlogs();
        blogs.push(newBlog);
        await writeBlogs(blogs);
        res.status(201).send('Blog added');
    } catch (err) {
        res.status(500).send('Error writing blog file');
    }
});

// POST endpoint to add a comment to a blog
app.post('/api/blogs/:index/comments', async (req, res) => {
    const index = req.params.index;
    const { comment } = req.body;
    try {
        const blogs = await readBlogs();
        if (blogs[index]) {
            blogs[index].comments.push(comment);
            await writeBlogs(blogs);
            res.status(200).send('Comment added');
        } else {
            res.status(404).send('Blog not found');
        }
    } catch (err) {
        res.status(500).send('Error writing blog file');
    }
});