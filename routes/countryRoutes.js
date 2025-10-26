const express = require('express');
const router = express.Router();
const countryController = require('../controllers/countryController');
const statusController = require('../controllers/statusController');

// Refresh countries data
router.post('/refresh', countryController.refreshCountries);
// Get summary image
router.get('/image', countryController.getCountriesImage);

// Get all countries with filtering and sorting
router.get('/', countryController.getCountries);

// Get specific country by name
router.get('/:name', countryController.getCountryByName);

// Delete country by name
router.delete('/:name', countryController.deleteCountry);


module.exports = router;