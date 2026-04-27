# Abhaya Backend Server

A minimal Node.js/Express server that handles secure SOS SMS sending via Twilio.

## Setup

```bash
cd backend
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

## Run

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

## API Endpoints

### POST `/api/sos/send`
Sends SOS SMS to a list of emergency contacts.

**Request Body:**
```json
{
  "message": "🆘 EMERGENCY! Help needed at...",
  "contacts": ["+919326786943", "+91XXXXXXXXXX"]
}
```

**Response:**
```json
{
  "success": true,
  "sent": 2,
  "failed": 0
}
```

### GET `/health`
Health check endpoint.
