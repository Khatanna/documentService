const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');
const sizeOf = require('image-size');

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
        return fs.readFileSync(tagValue, 'binary');
      },
      getSize: (img) => {
        const buffer = Buffer.isBuffer(img) ? img : Buffer.from(img, 'binary');
        const dimensions = sizeOf.imageSize(buffer); // retorna { width, height }
        return [40, 40];
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
