const countryModel = require('../models/countryModel');

class StatusController {
    async getStatus(req, res) {
        try {
            const status = await countryModel.getStatus();
            res.json(status);
        } catch (error) {
            console.error('Status error:', error.message);
            res.status(500).json({
                error: 'Internal server error',
                details: error.message
            });
        }
    }
}

module.exports = new StatusController();