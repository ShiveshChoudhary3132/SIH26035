# NAWI Test Report Generator (SIH26035)

A web-based software application for generating test reports for Non-Automatic Weighing Instruments (NAWI) as per OIML Recommendation R-76.

## Features

- **Instrument Management**: Capture and store detailed instrument technical specifications (Class, Min/Max capacity, verification intervals).
- **Report Generation**: Follow OIML R-76 procedures for Repeatability, Eccentricity, Weighing Performance, and Tare tests.
- **Automated Calculations**: Calculates Maximum Permissible Error (MPE) based on OIML R-76 guidelines for Class II and III instruments.
- **Data Validation & Compliance**: Automatically evaluates each test observation against the allowed MPE to flag Pass/Fail.
- **PDF Export**: Built-in support to cleanly print and save completed reports to PDF.
- **Test History Repository**: View past tests and search instruments seamlessly.

## Getting Started

First, install dependencies if not already done:

```bash
npm install
```

Ensure the database is initialized:

```bash
npx prisma db push
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Tech Stack
- Framework: Next.js (App Router)
- Database: SQLite (via Prisma ORM)
- Styling: Tailwind CSS
- Icons: Lucide React
