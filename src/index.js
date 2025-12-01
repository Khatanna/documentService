const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { processTemplateWithImage } = require('./services/docx');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/docx', async (req, res) => {
  try {
    const replacements = req.body;
    const tenantId = req.headers['tenantid'];
    const template = req.headers['template'];
    if (!tenantId || !['CH0001', 'CH0002'].includes(tenantId)) {
      return res.status(400).json({ error: 'Invalid or missing tenantId in headers.' });
    }

    if (typeof replacements !== 'object' || Array.isArray(replacements)) {
      return res.status(400).json({ error: 'Invalid JSON body. Expected a dictionary of replacements.' });
    }

    const templatePath = path.join(__dirname, `../assets/${tenantId}/templates/${template}`);
    const logoPath = path.join(__dirname, `../assets/${tenantId}/logo/logo.png`);

    // Generate PDF instead of DOCX
    const resultBuffer = await processTemplateWithImage(
      templatePath,
      { ...replacements, logo: logoPath },
      logoPath,
      { outputFormat: 'pdf' }
    );

    res.end(resultBuffer, 'binary'); // Send the buffer as binary data
  } catch (error) {
    console.error('Error processing template:', error.message);
    res.status(500).json({ error: 'Failed to process the template. Please try again later.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
