const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');
const sizeOf = require('image-size');

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
 * Procesa una plantilla DOCX y realiza los reemplazos, incluyendo imágenes.
 * @param {string} templatePath - Ruta al archivo de plantilla DOCX.
 * @param {Object} replacements - Diccionario de reemplazos.
 * @returns {Buffer} - Archivo DOCX procesado como buffer.
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
        const dimensions = sizeOf.imageSize(buffer);

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
    // console.log(replacements);
    doc.render(replacements);

    return doc.getZip().generate({ type: 'nodebuffer' });
  } catch (error) {
    throw new Error(`Error processing template: ${error.message}`);
  }
}

module.exports = { processTemplateWithImage };
