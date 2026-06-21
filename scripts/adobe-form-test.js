const fs = require("fs");
const path = require("path");

const {
    PDFServices,
    MimeType,
    ExtractPDFParams,
    ExtractElementType,
    ExtractPDFJob,
    ExtractPDFResult,
    ServicePrincipalCredentials,
} = require("@adobe/pdfservices-node-sdk");

async function run() {
    try {
        const credentialsPath = path.join(
            process.cwd(),
            "downloads",
            "pdfservices-api-credentials.json"
        );

        const credentialsJSON = JSON.parse(
            fs.readFileSync(credentialsPath, "utf8")
        );

        const credentials = new ServicePrincipalCredentials({
            clientId: credentialsJSON.client_credentials.client_id,
            clientSecret:
                credentialsJSON.client_credentials.client_secret,
        });

        const pdfServices = new PDFServices({
            credentials,
        });

        const inputPath = path.join(
            process.cwd(),
            "downloads",
            "Form_7A_Plaintiffs_Claim.pdf"
        );

        const readStream = fs.createReadStream(inputPath);

        const inputAsset = await pdfServices.upload({
            readStream,
            mimeType: MimeType.PDF,
        });

        const params = new ExtractPDFParams({
            elementsToExtract: [ExtractElementType.TEXT],
        });

        const job = new ExtractPDFJob({
            inputAsset,
            params,
        });

        const pollingURL = await pdfServices.submit({ job });

        const pdfServicesResponse = await pdfServices.getJobResult({
            pollingURL,
            resultType: ExtractPDFResult,
        });

        const resultAsset = pdfServicesResponse.result.resource;

        const streamAsset = await pdfServices.getContent({
            asset: resultAsset,
        });

        const outputPath = path.join(
            process.cwd(),
            "downloads",
            "adobe-output.zip"
        );

        const writeStream = fs.createWriteStream(outputPath);

        streamAsset.readStream.pipe(writeStream);

        writeStream.on("finish", () => {
            console.log("");
            console.log("SUCCESS");
            console.log("Created adobe-output.zip");
        });
    } catch (err) {
        console.error("ERROR:");
        console.error(err);
    }
}

run();