## Overview

It is a travel guide system which provides user authentication, blog management, wishlist functionality, and integration with RapidAPI for live location-based services such as attractions, hotels, and restaurants. It also supports a variety of routes to serve static files and APIs.

## Features

- **User Authentication:**
  - User signup/login/logout with JWT authentication.
  - Password hashing using bcrypt.

- **RapidAPI Integration:**
  - Fetch attractions, hotels, and restaurants data based on latitude and longitude.
  - Location autocomplete and search functionality.

- **Wishlist Management:**
  - Add or remove travel packages to/from a user-specific wishlist.
  - View user-specific wishlist data.

- **Package Management:**
  - CRUD operations for travel packages (stored in JSON files).

- **Blog Management:**
  - Add and view blogs stored in a JSON file.
  - Add comments to specific blogs.

- **Admin Functionality:**
  - Admin verification using a secret key for privileged access.

## Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (local instance running at `localhost:27017`)
- **npm** (v7 or higher)
- **RapidAPI Key**

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables by creating a `.env` file:
   ```env
   PASS_KEY=<your-secret-key>
   ADMIN_ID=<your-admin-id>
   API_KEY=<your-rapidapi-key>
   ```

4. Start the MongoDB service on your system:
   ```bash
   mongod
   ```

5. Start the server:
   ```bash
   npm start
   ```

6. Open your browser and navigate to: `http://localhost:5500`

## Folder Structure
```
├── public
│   ├── index.html
│   ├── about.html
│   ├── liveloc_data.html
│   ├── admin
│   │   └── admin.html
│   ├── package
│   │   ├── home.html
│   │   ├── tphome.html
│   │   ├── wishlist.html
│   │   └── data
│   │       ├── packages.json
│   │       ├── wishlist.json
│   │       └── toppkg.json
│   ├── cityDetail.html
│   ├── attractions.html
│   ├── hotels.html
│   └── restaurants.html
├── views
│   ├── login.ejs
│   ├── signup.ejs
├── .env
├── server.js
└── package.json
```

## API Endpoints

### User Authentication
- `GET /login` - Render login page.
- `POST /login` - Authenticate user and issue a JWT.
- `GET /signup` - Render signup page.
- `POST /signup` - Create a new user.
- `GET /logout` - Log out the user by clearing cookies.

### Packages
- `GET /packages` - Retrieve all packages.
- `POST /packages` - Add a new package.
- `PUT /packages/:id` - Update a package by ID.
- `DELETE /packages/:id` - Delete a package by ID.

### Wishlist
- `POST /wishlist` - Add a package to the user's wishlist.
- `GET /wishlist` - Serve the wishlist page.
- `GET /api/wishlist` - Retrieve the user's wishlist.
- `DELETE /wishlist/:packageId` - Remove a package from the wishlist.

### Blogs
- `GET /api/blogs` - Retrieve all blogs.
- `POST /api/blogs` - Add a new blog.
- `POST /api/blogs/:index/comments` - Add a comment to a blog by index.

### RapidAPI Integration
- `GET /api/attractions` - Fetch nearby attractions.
- `GET /api/hotels` - Fetch nearby hotels.
- `GET /api/restaurants` - Fetch nearby restaurants.
- `GET /api/search` - Perform location search.
- `GET /api/autocomplete` - Get location suggestions based on input query.

## Development Notes

- Ensure MongoDB is running locally at `localhost:27017` before starting the server.
- Customize `packages.json` and `wishlist.json` files located in `public/package/data` for package data and wishlist storage.
- Use the provided `.env` file for managing sensitive information such as API keys and admin credentials.

## License
This project is licensed under the [MIT License](LICENSE).

## Acknowledgments

- **[RapidAPI](https://rapidapi.com/)** for providing travel-related APIs.
- **Node.js** for server-side execution.
- **MongoDB** for database support.
