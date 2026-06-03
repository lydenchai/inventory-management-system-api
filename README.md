# Inventory Management System Backend

Node.js backend for Inventory Management System using Express, Sequelize, and MySQL.

## Prerequisites

- Node.js (v18+ recommended)
- MySQL Server

## Setup

1. **Clone the repository**
   ```sh
   git clone "https://github.com/lydenchai/inventory-management-system-api"
   cd inventory-management-system-api
   ```
2. **Copy environment file**
   ```sh
   cp .env.example .env
   # Edit .env with your DB credentials and JWT secrets
   ```
3. **Install dependencies**
   ```sh
   npm install
   ```
4. **Initialize the database**
   - Ensure MySQL is running and the database in `.env` exists (or will be created).
   - To seed with sample data (users, roles, permissions, etc.):
     ```sh
     node scripts/seed.js
     ```
5. **Start the development server**
   ```sh
   npm run dev
   ```
   The server runs on the port specified in `.env` (default: 5001).

## Environment Variables

The following environment variables are required for the application:

| Variable         | Description                                     |
| ---------------- | ----------------------------------------------- |
| `DB_HOST`        | MySQL database host                             |
| `DB_USER`        | MySQL database user                             |
| `DB_PASSWORD`    | MySQL database password                         |
| `DB_NAME`        | MySQL database name                             |
| `DB_PORT`        | MySQL database port                             |
| `JWT_SECRET`     | Secret key for JWT authentication               |
| `REFRESH_SECRET` | Secret key for refresh tokens                   |
| `SMTP_HOST`      | SMTP server host for email notifications        |
| `SMTP_PORT`      | SMTP server port                                |
| `SMTP_SECURE`    | Use secure connection (true/false)              |
| `SMTP_USER`      | Email address for sending notifications         |
| `SMTP_PASS`      | App password for the email account              |
| `SMTP_FROM`      | Email address from which notifications are sent |

See `.env.example` for all options.

## Mail Setup

To enable email notifications (e.g., for order approvals/rejections), configure SMTP settings in your `.env` file:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_gmail_address@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_gmail_address@gmail.com
```

**Important:**

- You must use a Gmail account with 2-Step Verification enabled.
- Generate an [App Password](https://myaccount.google.com/apppasswords) for your Gmail account and use it as `SMTP_PASS`.
- `SMTP_USER` and `SMTP_FROM` must match the Gmail account for which you generated the App Password.
- Do **not** use your regular Gmail password.
- For a noreply address, create a dedicated Gmail account (e.g., `stock.management.noreply@gmail.com`) and generate an App Password for it.

**Troubleshooting:**

- If you get authentication errors, double-check that the App Password is for the same account as `SMTP_USER`/`SMTP_FROM`.
- Restart the backend server after updating `.env`.

## Project Structure

- `models/` - Sequelize models and database associations
- `routes/` - Express route definitions (Products, Orders, Reports, Users, etc.)
- `controllers/` - Route logic and business logic
- `middleware/` - Authentication, RBAC, file uploads, error handling
- `public/uploads/` - User-uploaded files (ignored by git)
- `scripts/` - Database seeding scripts
- `index.js` - App entry point

## Features

- **Authentication & Security:** JWT-based auth with refresh tokens and secure password hashing (bcrypt).
- **Role-Based Access Control (RBAC):** Fine-grained permissions (e.g., `view_product`, `create_order`) verified via middleware.
- **Core Entities:** CRUD for Products, Categories, Suppliers, Users, and Permissions.
- **Inventory Management:** Track Stocks (In/Out) with precise balance adjustments.
- **Order Lifecycle:** Complete flow for Order Requests (Pending → Approved/Rejected → Delivered).
- **Comprehensive Reports & Analytics:** Endpoints for Financial Summaries, Order Stats, Inventory Trends, and Dashboard Overviews.
- **Activity Logging:** Automatic tracking of system actions (e.g., entity creation, updates, deletes) to an Activity Logs table.
- **Standardized API:** Pagination, sorting, and dynamic filtering integrated natively into all listing endpoints.
- **File Uploads:** Support for multipart form data (profile images, receipts, etc.).

## Role & Permission Model

- Each user is assigned a single Permission (role) via `permission_id`.
- The Permission model contains a `permissions` array (e.g., `['view_dashboard', 'create_user']`).
- All access control is enforced via middleware using this array.
- To add new roles/permissions, update the Permission table and assign users accordingly.

## API Usage Example

All endpoints are prefixed with `/api`. Use JWT tokens for authenticated requests.

**Authentication Example:**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "<JWT token>",
    "refresh_token": "<refresh token>"
  }
}
```

Include the token in subsequent requests:
```
GET /api/products
Authorization: Bearer <access_token>
```

## Frontend

See [inventory-management-system-admin](https://github.com/lydenchai/inventory-management-system-admin) for frontend setup and usage.

## Notes

- Do not commit sensitive data or uploaded files.
- For production, use a persistent store for refresh tokens and configure CORS properly.
