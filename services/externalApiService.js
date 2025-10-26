const axios = require('axios');

class ExternalApiService {
    constructor() {
        this.countriesApiUrl = process.env.COUNTRIES_API_URL;
        this.exchangeRateApiUrl = process.env.EXCHANGE_RATE_API_URL;
        this.exchangeRates = null;
    }

    async fetchCountriesData() {
        try {
            console.log('Fetching countries data...');
            const response = await axios.get(this.countriesApiUrl, { timeout: 30000 });
            // console.log(`Fetched ${response.data.length} countries`);
            return response.data;
        } catch (error) {
            console.error('Error fetching countries data:', error.message);
            throw new Error(`Countries API unavailable: ${error.message}`);
        }
    }

    async fetchExchangeRates() {
        try {
            console.log('Fetching exchange rates...');
            const response = await axios.get(this.exchangeRateApiUrl, { timeout: 30000 });
            
            if (response.data.result === 'success') {
                this.exchangeRates = response.data.rates;
                // console.log(`Fetched ${Object.keys(this.exchangeRates).length} exchange rates`);
                return this.exchangeRates;
            } else {
                throw new Error('Exchange rate API returned error');
            }
        } catch (error) {
            console.error('Error fetching exchange rates:', error.message);
            throw new Error(`Exchange rates API unavailable: ${error.message}`);
        }
    }

    getCurrencyCode(currencies) {
        if (!currencies || currencies.length === 0) {
            return null;
        }
        
        // Get the first currency that has a code
        const firstCurrency = currencies[0];
        return firstCurrency.code || null;
    }

    getExchangeRate(currencyCode) {
        if (!currencyCode || !this.exchangeRates) {
            return null;
        }
        
        const rate = this.exchangeRates[currencyCode];
        return rate ? parseFloat(rate.toFixed(10)) : null;
    }

    calculateEstimatedGDP(population, exchangeRate) {
        if (!population || !exchangeRate) {
            return null;
        }
        
        const randomMultiplier = Math.random() * 1000 + 1000; 
        const gdp = (population * randomMultiplier) / exchangeRate;
        return parseFloat(gdp.toFixed(2)); 
    }
}

module.exports = new ExternalApiService();