const externalApiService = require('./externalApiService');
const countryModel = require('../models/countryModel');
const imageGenerator = require('../utils/imageGenerator');

class CountryService {
    async refreshCountriesData() {
        try {
            console.log('Starting countries refresh...');
            
            // Fetch exchange rates first
            await externalApiService.fetchExchangeRates();
            
            // Fetch countries data
            const countriesData = await externalApiService.fetchCountriesData();
            
            let processed = 0;
            let created = 0;
            let updated = 0;
            let errors = 0;

            for (const countryData of countriesData) {
                try {
                    processed++;
                    
                    const name = countryData.name;
                    if (!name) continue;

                    // Extract currency code
                    const currencyCode = externalApiService.getCurrencyCode(countryData.currencies || []);
                    
                    let exchangeRate = null;
                    let estimatedGDP = null;

                    // Handle currency logic according to requirements
                    if (!currencyCode) {
                        // If currencies array is empty
                        exchangeRate = null;
                        estimatedGDP = 0; 
                    } else {
                        // Get exchange rate
                        exchangeRate = externalApiService.getExchangeRate(currencyCode);
                        
                        // Calculate estimated GDP
                        if (countryData.population && exchangeRate) {
                            estimatedGDP = externalApiService.calculateEstimatedGDP(
                                countryData.population,
                                exchangeRate
                            );
                        } else {
                            estimatedGDP = null; 
                        }
                    }

                    const countryRecord = {
                        name: name,
                        capital: countryData.capital || null,
                        region: countryData.region || null,
                        population: countryData.population || 0,
                        currency_code: currencyCode, 
                        exchange_rate: exchangeRate, 
                        estimated_gdp: estimatedGDP,
                        flag_url: countryData.flag || null
                    };

                    const result = await countryModel.updateOrCreateCountry(countryRecord);
                    
                    if (result.created) {
                        created++;
                        console.log(`Created: ${name}`);
                    } else if (result.updated) {
                        updated++;
                        console.log(`Updated: ${name}`);
                    }
                    
                } catch (error) {
                    errors++;
                    console.error(`Error processing ${countryData.name || 'Unknown'}:`, error.message);
                }
            }

            console.log(`Refresh completed: ${processed} processed, ${created} created, ${updated} updated, ${errors} errors`);


    await imageGenerator.generateSummaryImage();
        
            return {
                processed,
                created,
                updated
            };

        } catch (error) {
            console.error('Error in refreshCountriesData:', error.message);
            throw error;
        }
    }
}

module.exports = new CountryService();