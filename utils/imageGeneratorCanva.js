const { createCanvas } = require('canvas');
const fs = require('fs').promises;
const path = require('path');

class ImageGenerator {
    constructor() {
        this.cacheDir = path.join(__dirname, '../cache');
        this.ensureCacheDir();
    }

    async ensureCacheDir() {
        try {
            await fs.access(this.cacheDir);
        } catch (error) {
            await fs.mkdir(this.cacheDir, { recursive: true });
        }
    }

    async generateSummaryImage(totalCountries, topCountries, lastRefreshedAt) {
        try {
            const width = 800;
            const height = 600;

            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            // Background
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, width, height);

            // Title
            ctx.fillStyle = '#0064c8';
            ctx.font = 'bold 32px Arial';
            ctx.fillText('Country Data Summary', 50, 50);

            // Statistics
            ctx.fillStyle = '#000000';
            ctx.font = '24px Arial';
            ctx.fillText(`Total Countries: ${totalCountries}`, 50, 120);

            ctx.font = '18px Arial';
            const lastUpdated = lastRefreshedAt 
                ? new Date(lastRefreshedAt).toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
                : 'Never';
            ctx.fillText(`Last Updated: ${lastUpdated}`, 50, 160);

            // Top 5 GDP countries
            ctx.fillStyle = '#0064c8';
            ctx.font = 'bold 24px Arial';
            ctx.fillText('Top 5 Countries by Estimated GDP:', 50, 220);

            ctx.fillStyle = '#000000';
            ctx.font = '18px Arial';
            
            let yPosition = 270;
            topCountries.forEach((country, index) => {
                const gdpValue = country.estimated_gdp ? parseFloat(country.estimated_gdp) : 0;
                const gdpFormatted = `$${gdpValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                const text = `${index + 1}. ${country.name}: ${gdpFormatted}`;
                ctx.fillText(text, 70, yPosition);
                yPosition += 35;
            });

            // Save image
            const buffer = canvas.toBuffer('image/png');
            const imagePath = path.join(this.cacheDir, 'summary.png');
            await fs.writeFile(imagePath, buffer);

            console.log(`Summary image generated: ${imagePath}`);
            return imagePath;
        } catch (error) {
            console.error('Error generating summary image:', error.message);
            return null;
        }
    }

    async getSummaryImage() {
        try {
            const imagePath = path.join(this.cacheDir, 'summary.png');
            await fs.access(imagePath);
            return imagePath;
        } catch (error) {
            return null;
        }
    }
}

module.exports = new ImageGenerator();