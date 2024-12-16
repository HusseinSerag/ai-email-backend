"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadS3 = exports.getS3Url = exports.UploadToS3 = void 0;
const aws_sdk_1 = require("aws-sdk");
const logger_1 = __importDefault(require("./logger"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function UploadToS3(file) {
    return new Promise((res, rej) => {
        const s3 = new aws_sdk_1.S3({
            region: "eu-north-1",
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY || "",
                secretAccessKey: process.env.AWS_SECRET || "",
            },
        });
        const fileKey = `uploads/${Date.now().toString()}${file.originalname.replace(" ", "-")}`;
        const params = {
            Bucket: process.env.BUCKET_NAME || "",
            Key: fileKey,
            Body: file.buffer,
        };
        s3.upload(params, {}, (err, data) => {
            if (err) {
                rej(err);
            }
            res({
                ...data,
                fileKey: fileKey,
            });
        }).on("httpUploadProgress", (progress) => {
            let sentProg = ((progress.loaded * 100) / progress.total).toString();
            logger_1.default.info("uploading to S3.... ", parseInt(sentProg), " %");
        });
    });
}
exports.UploadToS3 = UploadToS3;
function getS3Url(file_key) {
    const url = `https://${process.env.BUCKET_NAME}.s3.eu-north-1.amazonaws.com/${file_key}`;
    return url;
}
exports.getS3Url = getS3Url;
async function downloadS3(fileKey) {
    try {
        const s3 = new aws_sdk_1.S3({
            region: "eu-north-1",
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY || "",
                secretAccessKey: process.env.AWS_SECRET || "",
            },
        });
        const params = {
            Bucket: process.env.BUCKET_NAME || "",
            Key: fileKey,
        };
        const obj = await s3.getObject(params).promise();
        const tempDir = path_1.default.join(process.env.TEMP || process.env.TMP || "C:\\Temp", "pdf-temp");
        if (!fs_1.default.existsSync(tempDir)) {
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        }
        // Generate a unique filename
        const fileName = path_1.default.join(tempDir, `pdf-${Date.now()}.pdf`);
        fs_1.default.writeFileSync(fileName, obj.Body);
        return fileName;
    }
    catch (e) {
        throw e;
    }
}
exports.downloadS3 = downloadS3;
