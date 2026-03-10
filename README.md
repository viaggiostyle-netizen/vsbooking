# VSBooking – Barber Appointment System

VSBooking is a modern barber shop booking system built with **Next.js** and **Supabase**.  
It allows clients to schedule appointments online while administrators manage bookings through a secure internal dashboard.

---

## Features

### Public Booking System
- Clients can view available time slots
- Create appointments
- Cancel appointments within a configurable time limit

### Admin Dashboard
- Secure admin panel with restricted access
- Appointment management
- Admin management
- System settings configuration

### Security
- Google authentication via Supabase
- Admin access controlled by an `admins` database table
- Middleware protection for internal routes
- Unauthorized users receive a **404 page**

### Customizable Rules
Admins can configure:

- Appointment cancellation time (example: 3 hours before)
- System rules from the admin panel

---

## Tech Stack

- **Next.js (App Router)**
- **TypeScript**
- **Tailwind CSS**
- **Supabase**
  - Authentication
  - PostgreSQL Database
- **Middleware-based route protection**

---

## Project Structure
