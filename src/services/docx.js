import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import { imageSize } from 'image-size';
import { dirname, join } from 'path';
import libre from 'libreoffice-convert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tempDir = join(__dirname, '../../temp');
console.log({ tempDir });
const base64Regex =
  /^(?:data:)?image\/(png|jpg|jpeg|svg|svg\+xml);base64,/;

const validBase64 =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function base64Parser(tagValue) {
  if (typeof tagValue !== "string" || !base64Regex.test(tagValue)) {
    return false;
  }

  const stringBase64 = tagValue.replace(base64Regex, "");

  if (!validBase64.test(stringBase64)) {
    throw new Error(
      "Error parsing base64 data, your data contains invalid characters"
    );
  }

  return Buffer.from(stringBase64, "base64");
}

/**
 * Converts a DOCX buffer to a PDF buffer using docx-pdf.
 * @param {Buffer} docxBuffer - The DOCX file buffer.
 * @returns {Promise<Buffer>} - The PDF file buffer.
 */
async function convertDocxToPdf(docxBuffer) {
  return new Promise((resolve, reject) => {
    libre.convert(docxBuffer, '.pdf', undefined, (err, pdfBuffer) => {
      if (err) {
        return reject(new Error(`Error converting DOCX to PDF: ${err.message}`));
      }
      resolve(pdfBuffer);
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
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }

  try {
    const template = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(template);

    const imageOptions = {
      getImage: (tagValue, tagName, meta) => {
        const buffer = base64Parser(tagValue);

        if (buffer) return buffer;

        if (fs.existsSync(tagValue)) {
          return fs.readFileSync(tagValue);
        }

        throw new Error(`No se reconoce imagen para tag ${tagName}`);
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

    return await convertDocxToPdf(docxBuffer);
  } catch (error) {
    throw new Error(`Error processing template: ${error.message}`);
  }
}

export { processTemplateWithImage };
