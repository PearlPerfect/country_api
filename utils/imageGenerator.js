const { createCanvas, loadImage, registerFont } = require('canvas');
const countryModel = require('../models/countryModel');

const fs = require('fs').promises;
const path = require('path');

class SummaryImageGenerator {
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

    async generateSummaryImage(countryModel) {
        try {
            console.log("🖼️ Generating summary image...");
            
            // Get data for summary using the provided countryModel
            const status = await countryModel.getStatus();
            const totalCountries = status.total_countries;
            
            // Handle the top countries query safely
            let topCountries = [];
            try {
                topCountries = await countryModel.getTopCountriesByGDP(5);
            } catch (error) {
                console.error('⚠️ Could not fetch top countries, using empty array:', error.message);
                topCountries = [];
            }
            
            // Get last refresh time
            const lastRefreshTime = status.last_refreshed_at || new Date();
            
            // Create image dimensions
            const width = 800;
            const height = 600;

            // Create canvas
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
            const lastUpdated = lastRefreshTime 
                ? new Date(lastRefreshTime).toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
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
                const gdpFormatted = `$${gdpValue.toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                })}`;
                const text = `${index + 1}. ${country.name}: ${gdpFormatted}`;
                
                // Truncate long country names
                const maxWidth = 700;
                let displayText = text;
                if (ctx.measureText(text).width > maxWidth) {
                    // Truncate and add ellipsis
                    let truncated = text;
                    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 10) {
                        truncated = truncated.slice(0, -1);
                    }
                    displayText = truncated + '...';
                }
                
                ctx.fillText(displayText, 70, yPosition);
                yPosition += 35;
            });

            // Add border
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 2;
            ctx.strokeRect(10, 10, width - 20, height - 20);

            // Save image as PNG
            const buffer = canvas.toBuffer('image/png');
            const imagePath = path.join(this.cacheDir, 'summary.png');
            await fs.writeFile(imagePath, buffer);

            console.log(`✅ Summary image generated: ${imagePath}`);
            return imagePath;
            
        } catch (error) {
            console.error('❌ Error generating summary image:', error.message);
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

    // Alternative method if you want to pass data directly instead of countryModel
    async generateSummaryImageFromData(totalCountries, topCountries, lastRefreshedAt) {
        try {
            console.log("🖼️ Generating summary image from data...");
            
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
                const gdpFormatted = `$${gdpValue.toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                })}`;
                const text = `${index + 1}. ${country.name}: ${gdpFormatted}`;
                
                // Handle long text
                const maxWidth = 700;
                let displayText = text;
                if (ctx.measureText(text).width > maxWidth) {
                    let truncated = text;
                    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 10) {
                        truncated = truncated.slice(0, -1);
                    }
                    displayText = truncated + '...';
                }
                
                ctx.fillText(displayText, 70, yPosition);
                yPosition += 35;
            });

            // Border
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 2;
            ctx.strokeRect(10, 10, width - 20, height - 20);

            // Save image
            const buffer = canvas.toBuffer('image/png');
            const imagePath = path.join(this.cacheDir, 'summary.png');
            await fs.writeFile(imagePath, buffer);

            console.log(`✅ Summary image generated: ${imagePath}`);
            return imagePath;
            
        } catch (error) {
            console.error('❌ Error generating summary image:', error.message);
            return null;
        }
    }
}

module.exports = new SummaryImageGenerator();