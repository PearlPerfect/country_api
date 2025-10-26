const { pool } = require('../config/database');

class CountryModel {
    async createTable() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS countries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                capital VARCHAR(100),
                region VARCHAR(50),
                population BIGINT NOT NULL,
                currency_code VARCHAR(3),
                exchange_rate DECIMAL(20,10),
                estimated_gdp DECIMAL(30,2),
                flag_url TEXT,
                last_refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_name (name),
                INDEX idx_region (region),
                INDEX idx_currency (currency_code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        
        try {
            await pool.execute(createTableSQL);
            console.log('Countries table ready');
        } catch (error) {
            console.error('Error creating countries table:', error.message);
        }
    }

    async getAllCountries(filters = {}) {
        let query = 'SELECT * FROM countries WHERE 1=1';
        const params = [];

        if (filters.region) {
            query += ' AND region = ?';
            params.push(filters.region);
        }

        if (filters.currency) {
            query += ' AND currency_code = ?';
            params.push(filters.currency);
        }

        // Apply sorting
        const sortMap = {
            'gdp_desc': 'estimated_gdp DESC',
            'gdp_asc': 'estimated_gdp ASC',
            'population_desc': 'population DESC',
            'population_asc': 'population ASC',
            'name_asc': 'name ASC',
            'name_desc': 'name DESC'
        };

        if (filters.sort && sortMap[filters.sort]) {
            query += ` ORDER BY ${sortMap[filters.sort]}`;
        } else {
            query += ' ORDER BY name ASC';
        }

        try {
            const [rows] = await pool.execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error fetching countries:', error.message);
            throw error;
        }
    }

    async getCountryByName(name) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM countries WHERE name = ?',
                [name]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error fetching country:', error.message);
            throw error;
        }
    }

    async updateOrCreateCountry(countryData) {
        const {
            name,
            capital,
            region,
            population,
            currency_code,
            exchange_rate,
            estimated_gdp,
            flag_url
        } = countryData;

        const query = `
            INSERT INTO countries 
            (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            capital = VALUES(capital),
            region = VALUES(region),
            population = VALUES(population),
            currency_code = VALUES(currency_code),
            exchange_rate = VALUES(exchange_rate),
            estimated_gdp = VALUES(estimated_gdp),
            flag_url = VALUES(flag_url),
            last_refreshed_at = CURRENT_TIMESTAMP
        `;

        try {
            const [result] = await pool.execute(query, [
                name, capital, region, population, currency_code, 
                exchange_rate, estimated_gdp, flag_url
            ]);
            
            return {
                created: result.affectedRows === 1 && result.insertId !== 0,
                updated: result.affectedRows === 2
            };
        } catch (error) {
            console.error('Error updating/creating country:', error.message);
            throw error;
        }
    }

    async deleteCountry(name) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM countries WHERE name = ?',
                [name]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting country:', error.message);
            throw error;
        }
    }

async getStatus() {
        try {
            const [[{ total_countries }]] = await pool.execute(
                'SELECT COUNT(*) as total_countries FROM countries'
            );
            
            const [[{ last_refreshed_at }]] = await pool.execute(
                'SELECT last_refreshed_at FROM countries ORDER BY last_refreshed_at DESC LIMIT 1'
            );

            return {
                total_countries,
                last_refreshed_at: last_refreshed_at || null
            };
        } catch (error) {
            console.error('Error fetching status:', error.message);
            throw error;
        }
    }

async getTopCountriesByGDP(limit = 5) {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM countries WHERE estimated_gdp IS NOT NULL ORDER BY estimated_gdp DESC LIMIT ?',
            [limit.toString()]  // Convert to string to avoid parameter mismatch
        );
        return rows;
    } catch (error) {
        console.error('Error fetching top countries:', error.message);
        throw error;
    }
}
}

module.exports = new CountryModel();