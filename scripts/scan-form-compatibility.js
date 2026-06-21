const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

const formsDir = path.join(process.cwd(), "downloads");

async function scanPdf(filePath) {
    try {
        const bytes = fs.readFileSync(filePath);

        const pdfDoc = await PDFDocument.load(bytes, {
            ignoreEncryption: true,
        });

        const form = pdfDoc.getForm();

        const fields = form.getFields();

        return {
            compatible: true,
            fieldCount: fields.length,
            fields: fields.map((f) => f.getName()),
        };
    } catch (err) {
        return {
            compatible: false,
            error: err.message,
        };
    }
}

async function run() {
    if (!fs.existsSync(formsDir)) {
        console.log("No downloads folder found.");
        return;
    }

    const files = fs
        .readdirSync(formsDir)
        .filter((f) => f.toLowerCase().endsWith(".pdf"));

    const results = [];

    for (const file of files) {
        const fullPath = path.join(formsDir, file);

        console.log(`Scanning: ${file}`);

        const result = await scanPdf(fullPath);

        results.push({
            file,
            ...result,
        });
    }

    fs.writeFileSync(
        path.join(process.cwd(), "form-compatibility-report.json"),
        JSON.stringify(results, null, 2)
    );

    console.log("");
    console.log("DONE");
    console.log("Created: form-compatibility-report.json");
}

run();