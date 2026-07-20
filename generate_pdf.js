const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        
        const filePath = path.join(__dirname, 'node_architecture.html');
        await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0' });
        
        // Output the PDF
        const pdfPath = path.join(__dirname, 'node_architecture.pdf');
        await page.pdf({
            path: pdfPath,
            format: 'A3',
            landscape: true,
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });
        
        console.log(`Successfully generated PDF at ${pdfPath}`);
        await browser.close();
    } catch (e) {
        console.error("Error generating PDF:", e);
    }
})();
