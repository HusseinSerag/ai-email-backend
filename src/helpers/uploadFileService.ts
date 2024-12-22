import { UploadToS3, getS3Url } from "../lib/s3";
import { EmailAttachment } from "../type";

export async function uploadFilesService(
  files:
    | {
        [fieldname: string]: Express.Multer.File[];
      }
    | Express.Multer.File[]
    | undefined
) {
  const file = files as Express.Multer.File[];
  let filesUploaded: Omit<EmailAttachment, "id" | "size">[] = [];
  if (file && file.length > 0) {
    // upload file to s3
    // get back info
    await Promise.all(
      file.map(async (file) => {
        const { fileKey } = await UploadToS3(file);

        filesUploaded.push({
          mimeType: file.mimetype,
          name: file.originalname,
          inline: false,
          contentLocation: getS3Url(fileKey),
          content: file.buffer.toString("base64"),
          contentId: fileKey,
        });
      })
    );
  }
  return filesUploaded;
}
