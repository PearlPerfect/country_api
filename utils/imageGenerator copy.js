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
            console.log("🖼️ Generating summary image...");
            
            // Create a simple text-based image (SVG)
            const svgContent = this.createSVGImage(totalCountries, topCountries, lastRefreshedAt);
            
            const imagePath = path.join(this.cacheDir, 'summary.png');
            
            // For now, let's create a simple text file as image
            // In production, you might want to use a proper image library
            const textContent = this.createTextImage(totalCountries, topCountries, lastRefreshedAt);
            await fs.writeFile(imagePath.replace('.png', '.txt'), textContent);
            
            console.log(`✅ Summary data saved: ${imagePath.replace('.png', '.txt')}`);
            
            // Return the text file path for now
            return imagePath.replace('.png', '.txt');
            
        } catch (error) {
            console.error('❌ Error generating summary image:', error.message);
            return null;
        }
    }

    createTextImage(totalCountries, topCountries, lastRefreshedAt) {
        let content = "COUNTRY DATA SUMMARY\n";
        content += "====================\n\n";
        content += `Total Countries: ${totalCountries}\n`;
        content += `Last Updated: ${lastRefreshedAt ? new Date(lastRefreshedAt).toISOString() : 'Never'}\n\n`;
        content += "Top 5 Countries by Estimated GDP:\n";
        content += "---------------------------------\n";
        
        topCountries.forEach((country, index) => {
            const gdpValue = country.estimated_gdp ? parseFloat(country.estimated_gdp).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) : '0.00';
            content += `${index + 1}. ${country.name}: $${gdpValue}\n`;
        });
        
        return content;
    }

    createSVGImage(totalCountries, topCountries, lastRefreshedAt) {
        // Simple SVG implementation
        return `
        <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f0f0f0"/>
            <text x="50" y="50" font-family="Arial" font-size="32" fill="#0064c8" font-weight="bold">Country Data Summary</text>
            <text x="50" y="120" font-family="Arial" font-size="24" fill="#000000">Total Countries: ${totalCountries}</text>
            <text x="50" y="160" font-family="Arial" font-size="18" fill="#000000">Last Updated: ${lastRefreshedAt ? new Date(lastRefreshedAt).toISOString().substring(0, 19) + ' UTC' : 'Never'}</text>
            <text x="50" y="220" font-family="Arial" font-size="24" fill="#0064c8" font-weight="bold">Top 5 Countries by Estimated GDP:</text>
            ${this.generateTopCountriesSVG(topCountries)}
        </svg>
        `;
    }

    generateTopCountriesSVG(topCountries) {
        let yPosition = 270;
        return topCountries.map((country, index) => {
            const gdpValue = country.estimated_gdp ? parseFloat(country.estimated_gdp).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) : '0.00';
            const text = `<text x="70" y="${yPosition}" font-family="Arial" font-size="18" fill="#000000">${index + 1}. ${country.name}: $${gdpValue}</text>`;
            yPosition += 35;
            return text;
        }).join('');
    }

    async getSummaryImage() {
        try {
            const imagePath = path.join(this.cacheDir, 'summary.txt');
            await fs.access(imagePath);
            return imagePath;
        } catch (error) {
            return null;
        }
    }
}

module.exports = new ImageGenerator();