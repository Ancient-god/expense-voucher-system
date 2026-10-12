# Expense Voucher Management System

A web-based application for managing expense vouchers through a structured approval workflow. The system allows employees to submit expense claims, directors to review and approve or reject them, and the accounts team to manage approved vouchers.

## Features

- **Employee Dashboard**
  - Create and manage draft expense vouchers.
  - Enter expense details such as department, category, date, description, and amount.
  - Upload a signature and submit vouchers for approval.
  - Track voucher status.

- **Director Dashboard**
  - View and filter expense vouchers.
  - Review submitted vouchers.
  - Approve or reject vouchers.
  - Upload a director's signature.

- **Accounts Dashboard**
  - View and filter vouchers.
  - Search by employee, department, category, voucher number, date, and amount.
  - Sort and review voucher information.

- **Authentication and Authorization**
  - Login and registration.
  - Role-based access for employees, directors, and accounts users.
  - Protected backend routes.

## Technology Stack

**Frontend**
- React
- Vite
- JavaScript
- CSS
- Axios

**Backend**
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT authentication
- Multer for file uploads

## Project Structure

```text
expense-voucher-system/
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   ├── index.html
│   └── package.json
├── postman/
├── .gitignore
└── README.md
```

*The structure above is illustrative; adjust it to match the files actually present in the repository.*

## Prerequisites

Install the following before running the application:

- Node.js and npm
- MongoDB, running locally or hosted
- Git (optional)

## Installation and Setup

### 1. Clone the repository

```bash
cd expense-voucher-system
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory using `.env.example` as a guide. Add your own configuration values:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

Use the actual variable names expected by your backend code. Never commit your real `.env` file or publish secrets.

### 3. Start the backend

```bash
npm start
```

If your `package.json` uses a different development script, run the appropriate command, such as `npm run dev`.

### 4. Configure and start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

If your frontend requires an API URL environment variable, configure it according to your application code. The local backend API is typically available at `http://localhost:5000/api`.

Open the local URL displayed by Vite in your terminal.

## Expense Voucher Workflow

1. An employee creates a voucher and saves it as a draft.
2. The employee submits the voucher for review.
3. The director reviews the voucher and approves or rejects it.
4. The accounts team reviews the relevant vouchers and their approval details.

The exact status transitions depend on the backend implementation.

## Security Notes

- Keep `.env` files and credentials private.
- Do not upload `node_modules` or personal signature images.
- Use strong JWT secrets.
- Protect backend routes with authentication and role-based authorization.
- Validate voucher ownership and status on the server.
- Use appropriate access controls for uploaded files.

## Future Improvements

- Deploy the frontend and backend.
- Add automated tests.
- Improve reporting and expense analytics.
- Add pagination and export functionality.
- Improve audit logging and error handling.

## Author

**prathvi raj shingle**

## License

No license has been specified yet.
