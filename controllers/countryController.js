const countryService = require('../services/countryService');
const countryModel = require('../models/countryModel');
const imageGenerator = require('../utils/imageGenerator');
const fs = require('fs').promises;
const path = require('path');

class CountryController {
    async refreshCountries(req, res) {
        try {
            const result = await countryService.refreshCountriesData();
            
            // Generate summary image after refresh
            const status = await countryModel.getStatus();
            const topCountries = await countryModel.getTopCountriesByGDP(5);
            await imageGenerator.generateSummaryImage(
                status.total_countries,
                topCountries,
                status.last_refreshed_at
            );
            
            res.json({
                message: 'Countries data refreshed successfully',
                countries_processed: result.processed,
                countries_created: result.created,
                countries_updated: result.updated,
                errors: result.errors
            });
        } catch (error) {
            console.error('Refresh error:', error.message);
            
            if (error.message.includes('unavailable')) {
                res.status(503).json({
                    error: 'External data source unavailable',
                    details: error.message
                });
            } else {
                res.status(500).json({
                    error: 'Internal server error',
                    details: error.message
                });
            }
        }
    }

    async getCountries(req, res) {
        try {
            const validParams = ['region', 'currency', 'sort'];
            const providedParams = Object.keys(req.query);
            
            // Check for invalid parameters
            const invalidParams = providedParams.filter(param => !validParams.includes(param));
            if (invalidParams.length > 0) {
                return res.status(400).json({
                    error: 'Invalid query parameters',
                    invalid_parameters: invalidParams,
                    valid_parameters: validParams
                });
            }

            const countries = await countryModel.getAllCountries(req.query);
            
            res.json(countries); 
        } catch (error) {
            console.error('Get countries error:', error.message);
            res.status(500).json({
                error: 'Internal server error',
                details: error.message
            });
        }
    }

    async getCountryByName(req, res) {
        try {
            const { name } = req.params;
            const country = await countryModel.getCountryByName(name);
            
            if (!country) {
                return res.status(404).json({
                    error: 'Country not found'
                });
            }
            
            res.json(country);
        } catch (error) {
            console.error('Get country error:', error.message);
            res.status(500).json({
                error: 'Internal server error',
                details: error.message
            });
        }
    }

    async deleteCountry(req, res) {
        try {
            const { name } = req.params;
            const deleted = await countryModel.deleteCountry(name);
            
            if (!deleted) {
                return res.status(404).json({
                    error: 'Country not found'
                });
            }
            
            res.json({
                message: `Country ${name} deleted successfully`
            });
        } catch (error) {
            console.error('Delete country error:', error.message);
            res.status(500).json({
                error: 'Internal server error',
                details: error.message
            });
        }
    }

    async getCountriesImage(req, res) {
        try {
            const imagePath = await imageGenerator.getSummaryImage();
            
            if (!imagePath) {
                return res.status(404).json({
                    error: 'Summary image not found'
                });
            }
            
            const imageBuffer = await fs.readFile(imagePath);
            res.set('Content-Type', 'image/png');
            res.send(imageBuffer);
        } catch (error) {
            res.status(500).json({
                error: 'Internal server error',
                details: error.message
            });
        }
    }
}

module.exports = new CountryController();