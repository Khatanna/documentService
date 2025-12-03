import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import { imageSize } from 'image-size';
import docxConverter from 'docx-pdf';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const base64Regex =
  /^(?:data:)?image\/(png|jpg|jpeg|svg|svg\+xml);base64,/;

const validBase64 =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function base64Parser(tagValue) {
  if (
    typeof tagValue !== "string" ||
    !base64Regex.test(tagValue)
  ) {
    return false;
  }

  const stringBase64 = tagValue.replace(base64Regex, "");

  if (!validBase64.test(stringBase64)) {
    throw new Error(
      "Error parsing base64 data, your data contains invalid characters"
    );
  }

  if (typeof Buffer !== "undefined" && Buffer.from) {
    return Buffer.from(stringBase64, "base64");
  }

  const binaryString = window.atob(stringBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    const ascii = binaryString.charCodeAt(i);
    bytes[i] = ascii;
  }
  return bytes.buffer;
}

/**
 * Converts a DOCX buffer to a PDF buffer using docx-pdf.
 * @param {Buffer} docxBuffer - The DOCX file buffer.
 * @returns {Promise<Buffer>} - The PDF file buffer.
 */
async function convertDocxToPdf(docxBuffer) {
  const tempDir = join(__dirname, '../../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const inputPath = join(tempDir, 'temp.docx');
  const outputPath = join(tempDir, 'temp.pdf');

  fs.writeFileSync(inputPath, docxBuffer);

  return new Promise((resolve, reject) => {
    docxConverter(inputPath, outputPath, (err, result) => {
      if (err) {
        reject(new Error(`Error converting DOCX to PDF: ${err.message}`));
      } else {
        const pdfBuffer = fs.readFileSync(outputPath);

        // Clean up temporary files
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);

        resolve(pdfBuffer);
      }
    });
  });
}

/**
 * Procesa una plantilla DOCX y realiza los reemplazos, incluyendo imágenes.
 * Genera el documento final en formato PDF.
 * @param {string} templatePath - Ruta al archivo de plantilla DOCX.
 * @param {Object} replacements - Diccionario de reemplazos.
 * @returns {Buffer} - Archivo PDF procesado como buffer.
 */
async function processTemplateWithImage(templatePath, replacements) {
  try {
    const template = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(template);

    const imageOptions = {
      getImage: (tagValue, tagName, meta) => {
        console.log({ tagValue, tagName, meta });
        if (tagName === 'signature') {
          return base64Parser(tagValue);
        }

        return fs.readFileSync(tagValue, 'binary');
      },
      getSize: (img, tagValue, tagName, context) => {
        const buffer = Buffer.isBuffer(img) ? img : Buffer.from(img, 'binary');
        const dimensions = imageSize(buffer);

        if (tagName === 'logo') {
          return [90, 90];
        }

        return [dimensions.width, dimensions.height];
      }
    };

    const doc = new Docxtemplater(zip, {
      modules: [new ImageModule(imageOptions)],
      paragraphLoop: true,
      linebreaks: true,
    });
    doc.render(replacements);

    const docxBuffer = doc.getZip().generate({ type: 'nodebuffer' });

    // Convert the DOCX buffer to a PDF buffer
    return await convertDocxToPdf(docxBuffer);
  } catch (error) {
    throw new Error(`Error processing template: ${error.message}`);
  }
}

export { processTemplateWithImage };
