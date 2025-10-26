# Country Currency & Exchange API

A RESTful API that fetches country data from external sources, caches it in MySQL, and provides CRUD operations and summary image generation.

This README documents the project structure, setup instructions, endpoints, validation rules, behavior of the refresh flow, error handling, and deployment notes.

---

## Table of Contents

* [Project Overview](#project-overview)
* [Features](#features)
* [Tech Stack](#tech-stack)
* [Repository Structure](#repository-structure)
* [Database Schema](#database-schema)
* [Environment Variables](#environment-variables)
* [Setup & Run Locally](#setup--run-locally)
* [API Endpoints](#api-endpoints)
* [Refresh Behavior & Rules](#refresh-behavior--rules)
* [Image Generation](#image-generation)
* [Validation & Error Responses](#validation--error-responses)
* [Testing](#testing)
* [Deployment Notes](#deployment-notes)
* [Troubleshooting](#troubleshooting)
* [Contributing](#contributing)
* [License](#license)

---

## Project Overview

This service:

1. Fetches country metadata from `https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies`.
2. Fetches USD-based exchange rates from `https://open.er-api.com/v6/latest/USD`.
3. Matches each country's primary currency to an exchange rate.
4. Computes a cached `estimated_gdp` for each country using a random multiplier between 1000 and 2000.
5. Stores (or updates) country records in a MySQL database when `POST /countries/refresh` runs.
6. Generates a summary image at `cache/summary.png` (total countries, top-5 by estimated_gdp, timestamp).
7. Exposes CRUD endpoints and a status endpoint.

> NOTE: The database is **only** updated when `POST /countries/refresh` successfully completes. If external APIs fail, the DB must remain unchanged.

## Features

* Refresh and cache country + exchange data
* Filtering and sorting when listing countries
* CRUD operations (read, delete)
* Summary image generation and serving
* Robust error handling and validation

## Tech Stack (suggested)

* Language: Node.js (Express) or any language of your choice
* Database: MySQL
* Image Generation: node-canvas / Pillow / ImageMagick (depending on language)
* ORM: Sequelize / TypeORM / Prisma / raw SQL
* Environment: `.env` for configuration

> This README assumes a Node.js + Express + Sequelize example, but the rules apply to any implementation.

## Repository Structure (suggested)

```
country-currency-exchange-api/
├── src/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── cache/
│   └── summary.png
├── migrations/
├── tests/
├── .env.example
├── package.json
└── README.md
```

## Database Schema

Suggested `countries` table (MySQL):

```sql
CREATE TABLE countries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  capital VARCHAR(255),
  region VARCHAR(100),
  population BIGINT NOT NULL,
  currency_code VARCHAR(10),
  exchange_rate DOUBLE,
  estimated_gdp DOUBLE,
  flag_url TEXT,
  last_refreshed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_country_name_lower ON countries(LOWER(name)); -- optional for case-insensitive match
```

Notes:

* `currency_code` is nullable; when currencies array is empty set to `NULL`.
* `exchange_rate` is nullable when the currency code is not present in the exchange rates payload.
* `estimated_gdp` is `0` or `NULL` depending on rules in the spec (see "Refresh Behavior").

## Environment Variables

Create a `.env` file based on `.env.example` with values appropriate for your environment.

```.env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=countries_cache
EXTERNAL_COUNTRIES_API=https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies
EXTERNAL_EXCHANGE_API=https://open.er-api.com/v6/latest/USD
IMAGE_CACHE_DIR=cache
IMAGE_CACHE_FILE=cache/summary.png
REQUEST_TIMEOUT_MS=10000
```

## Setup & Run Locally (Node.js example)

1. Clone the repo

```bash
git clone <repo-url> country-currency-exchange-api
cd country-currency-exchange-api
```

2. Install dependencies

```bash
npm install
```

3. Create `.env` from `.env.example` and set DB credentials

4. Create the MySQL database and run migrations (example using Sequelize)

```bash
# create DB manually or via script
mysql -u root -p -e "CREATE DATABASE countries_cache;"

# run migrations
npx sequelize-cli db:migrate
```

5. Run the server

```bash
npm start
# or for development
npm run dev
```

6. Refresh the cache (first run)

```bash
curl -X POST http://localhost:3000/countries/refresh
```

Expected: `200 OK` with a JSON message indicating success, and `cache/summary.png` generated.

## API Endpoints

### POST /countries/refresh

* Description: Fetch all countries and USD-based exchange rates, compute fields, and insert/update records in DB. On success update a global `last_refreshed_at` timestamp and generate `cache/summary.png`.
* Success: `200 OK` with `{ "message": "Refreshed X countries", "last_refreshed_at": "2025-10-22T18:00:00Z" }`
* Errors:

  * `503 Service Unavailable` if either external API fails. Response: `{ "error": "External data source unavailable", "details": "Could not fetch data from [API name]" }`
  * `500 Internal server error` for unexpected failures.

Behavioral details covered in the [Refresh Behavior & Rules](#refresh-behavior--rules) section.

### GET /countries

* Description: Return countries stored in DB.

* Query params (optional):

  * `region` — e.g., `Africa`
  * `currency` — `NGN`, `USD`, etc.
  * `sort` — `gdp_desc` (or `gdp_asc`). If empty, default sort by `name` ascending.
  * `limit` — number of items
  * `offset` — pagination

* Example: `GET /countries?region=Africa&sort=gdp_desc`

* Response: `200 OK` with array of country objects (see sample in the task description).

### GET /countries/:name

* Description: Case-insensitive lookup by country name.
* Success: `200 OK` and country object.
* Not found: `404` `{ "error": "Country not found" }`

### DELETE /countries/:name

* Description: Delete a country record (case-insensitive name match).
* Success: `200 OK` `{ "message": "Country deleted" }`
* Not found: `404` `{ "error": "Country not found" }`

### GET /status

* Description: Returns total countries and the last refresh timestamp.
* Success: `200 OK` with:

```json
{
  "total_countries": 250,
  "last_refreshed_at": "2025-10-22T18:00:00Z"
}
```

### GET /countries/image

* Description: Serve `cache/summary.png` generated by the last successful refresh.
* Success: Returns PNG binary with `Content-Type: image/png`.
* If not found: `404` with `{ "error": "Summary image not found" }`

## Refresh Behavior & Rules

This is the most critical area — follow precisely.

1. Fetch countries payload from `EXTERNAL_COUNTRIES_API` and the exchange rates payload from `EXTERNAL_EXCHANGE_API`.

2. If either fetch fails (non-200, times out), abort and return `503` to caller. **Do not modify DB.**

3. For each country in the countries payload:

   * Extract `name` (required), `capital` (optional), `region` (optional), `population` (required), `flag` (optional), `currencies` (array).
   * If `currencies` is empty:

     * Set `currency_code` = `NULL`
     * Set `exchange_rate` = `NULL`
     * Set `estimated_gdp` = `0`
     * Still insert/update the row
   * Else take only the **first** currency object and use its `code` (e.g., `NGN`). Store this as `currency_code`.
   * Look up `currency_code` inside exchange rates (which is keyed by currency codes in the open.er-api data). If not found:

     * Set `exchange_rate` = `NULL`
     * Set `estimated_gdp` = `NULL`
     * Still insert/update the row
   * If found:

     * `exchange_rate` = the rate from payload (double)
     * `multiplier` = random integer between `1000` and `2000` (inclusive)
     * `estimated_gdp` = `population * multiplier / exchange_rate`

4. Update vs Insert:

   * Match by `name` case-insensitively (e.g., compare lowercased values).
   * If exists: update all fields and set `last_refreshed_at` to the current timestamp for that record. Recompute estimated_gdp using a fresh random multiplier.
   * If not exists: insert new record with calculated fields.

5. After processing all countries successfully:

   * Commit changes to DB (wrap in a transaction if possible; or perform changes safely so that partial updates aren't committed on failure).
   * Update the global `last_refreshed_at` (this can be stored in a separate `metadata` table or derived as the latest `last_refreshed_at` across countries).
   * Generate the summary image and save to `cache/summary.png`.
   * Return `200` with success message and the `last_refreshed_at` timestamp.

## Image Generation

When a successful refresh completes, generate an image file `cache/summary.png` containing:

* Total number of countries cached
* Top 5 countries by `estimated_gdp` (show `name` and `estimated_gdp` formatted)
* Timestamp of last refresh (ISO 8601 UTC)

Implementation notes:

* Use `node-canvas` (Node.js) or `Pillow` (Python) to render text/data into a clean PNG.
* Ensure `cache/` directory exists and is writable by the app.
* Overwrite `cache/summary.png` on each successful refresh.

If `GET /countries/image` is called and `cache/summary.png` doesn't exist, return `404` JSON: `{ "error": "Summary image not found" }`.

## Validation & Error Responses

* Validation rules for incoming data and query params:

  * `name` (when creating/updating via refresh flow is required from external data)
  * `population` required and must be numeric
  * `currency_code` required for countries that have currencies array (otherwise store `NULL` per rules)

* Return `400 Bad Request` for invalid/missing required fields in client-sent data (though primary data is provided by external APIs):

Example 400 response:

```json
{
  "error": "Validation failed",
  "details": {
    "currency_code": "is required"
  }
}
```

* Common error responses (consistent JSON):

  * `404` → `{ "error": "Country not found" }`
  * `400` → `{ "error": "Validation failed", "details": { ... } }`
  * `500` → `{ "error": "Internal server error" }`
  * `503` → `{ "error": "External data source unavailable", "details": "Could not fetch data from [API name]" }`

## Sample Requests & Responses

**Refresh**

```
POST /countries/refresh

200 OK
{
  "message": "Refreshed 250 countries",
  "last_refreshed_at": "2025-10-22T18:00:00Z"
}
```

**List (filter by region)**

```
GET /countries?region=Africa

200 OK
[
  {
    "id": 1,
    "name": "Nigeria",
    "capital": "Abuja",
    "region": "Africa",
    "population": 206139589,
    "currency_code": "NGN",
    "exchange_rate": 1600.23,
    "estimated_gdp": 25767448125.2,
    "flag_url": "https://flagcdn.com/ng.svg",
    "last_refreshed_at": "2025-10-22T18:00:00Z"
  }
]
```

**Status**

```
GET /status

200 OK
{
  "total_countries": 250,
  "last_refreshed_at": "2025-10-22T18:00:00Z"
}
```

**Get image**

```
GET /countries/image
# returns binary image; or on missing
404
{ "error": "Summary image not found" }
```

## Testing

* Unit tests:

  * Test the currency extraction logic (handles multiple currencies and empty arrays).
  * Test exchange rate lookup and behavior when rate is missing.
  * Test `estimated_gdp` computation (use a seeded random generator or stub multiplier to assert expected numeric results).
  * Test DB insert vs update behavior (case-insensitive name match).
* Integration tests:

  * Mock the external API responses (countries + exchange rates) and assert that `POST /countries/refresh` commits expected rows and generates the image.
  * Simulate external API failures and assert `503` response and no DB change.

Example using Jest (Node.js):

```bash
npm run test
```

## Deployment Notes

* Use environment variables to set DB credentials and API URLs.
* Ensure the `cache/` directory is persisted across restarts if you want the image to remain available.
* If deploying to managed services (Heroku, Railway, AWS, etc.), make sure to configure a persistent storage for the image or re-generate on startup.
* Set HTTP timeouts (e.g., `REQUEST_TIMEOUT_MS`) and retry policy for external API calls.

## Troubleshooting

**`POST /countries/refresh` returns 503**

* Check network connectivity to `restcountries.com` and `open.er-api.com`.
* Check the logs for the exact failing API name.

**Image not found**

* Confirm `cache/summary.png` exists and is readable by the web server.
* Confirm the app writes to the correct relative path. Use an absolute path configured via env var when in doubt.

## Contributing

Pull requests are welcome. Please include tests and update the README with any breaking changes.

## License

MIT

---

If you'd like, I can also:

* Provide a ready-to-run Node.js skeleton (`app.js`, models, controllers, and example migrations).
* Provide SQL migration files.
* Provide example tests (Jest) and image-generation script using `node-canvas`.

Tell me which of the above you'd like next and I will create the files for you.
