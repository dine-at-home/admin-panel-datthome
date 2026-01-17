# Dine at Home - Admin Panel

Admin panel for managing users, dinners, and advertisements for the Dine at Home platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file with the following variables:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

3. Run the development server:
```bash
npm run dev
```

The admin panel will be available at `http://localhost:3002`

## Features

### User Management
- View all users with search and filtering
- Block/unblock users
- Delete users (admin users cannot be deleted)
- View user statistics (dinners, bookings)

### Dinner Management
- View all dinners (active, inactive, past)
- Search dinners
- Remove dinners with reason selection (policy violation, inappropriate content, etc.)

### Ad Management
- Manage advertising banners displayed on the home page
- Two ad positions: Primary (first) and Secondary (second)
- Customize title, description, button text, link, and image
- Enable/disable ads

## Authentication

- Only users with the `admin` role can access the admin panel
- Admin login requires valid admin credentials
- Session is managed via JWT tokens stored in localStorage

## Backend API

The admin panel communicates with the backend API at `/api/admin/*` endpoints. Ensure the backend server is running and accessible at the configured `NEXT_PUBLIC_API_URL`.

## Notes

- The admin panel runs on port 3002 to avoid conflicts with the main frontend (port 3000)
- Admin routes require authentication and admin role verification
- All admin actions are logged on the backend for audit purposes
