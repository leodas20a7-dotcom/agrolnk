import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure marked with GFM
marked.setOptions({
  gfm: true,
  breaks: true,
});

function wrapInExecutiveTemplate(contentHtml, title, subtitle) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color: #1F2937;
      background-color: #FFFFFF;
    }
    @page {
      margin: 16mm 14mm 16mm 14mm;
      size: A4 portrait;
    }
    
    /* Typography & Hierarchy */
    h1 {
      font-size: 24px;
      font-weight: 800;
      color: #0B3326;
      border-bottom: 2px solid #10B981;
      padding-bottom: 8px;
      margin-top: 0;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
    }
    h2 {
      font-size: 18px;
      font-weight: 700;
      color: #0B3326;
      background: #F0FDF4;
      border-left: 4px solid #10B981;
      padding: 8px 12px;
      border-radius: 0 8px 8px 0;
      margin-top: 24px;
      margin-bottom: 12px;
      page-break-after: avoid;
    }
    h3 {
      font-size: 15px;
      font-weight: 700;
      color: #064E3B;
      margin-top: 18px;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #E5E7EB;
      page-break-after: avoid;
    }
    h4 {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-top: 12px;
      margin-bottom: 6px;
    }
    p {
      font-size: 12px;
      line-height: 1.65;
      color: #374151;
      margin-bottom: 10px;
    }
    
    /* Callouts & Blockquotes */
    blockquote {
      background-color: #F8FAF8;
      border-left: 3.5px solid #10B981;
      padding: 10px 14px;
      margin: 12px 0;
      border-radius: 0 10px 10px 0;
      font-size: 12px;
      color: #064E3B;
    }
    blockquote strong {
      color: #0B3326;
    }

    /* Lists */
    ul {
      margin: 8px 0 12px 18px;
      list-style-type: disc;
    }
    li {
      font-size: 12px;
      line-height: 1.6;
      color: #374151;
      margin-bottom: 4px;
    }
    li strong {
      color: #111827;
    }

    /* Inline Code & Monospace Badges */
    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      background-color: #ECFDF5;
      color: #065F46;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #A7F3D0;
    }
    pre {
      background-color: #0B3326;
      color: #A7F3D0;
      padding: 12px 16px;
      border-radius: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      line-height: 1.5;
      margin: 12px 0;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    pre code {
      background: transparent;
      border: none;
      color: inherit;
      padding: 0;
    }

    /* High Fidelity Tables */
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 14px 0;
      font-size: 11.5px;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    th {
      background-color: #0B3326;
      color: #FFFFFF;
      font-weight: 700;
      text-align: left;
      padding: 8px 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 2px solid #047857;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #F3F4F6;
      color: #374151;
      line-height: 1.45;
      vertical-align: middle;
    }
    tr:nth-child(even) td {
      background-color: #F9FAFB;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr td strong {
      color: #111827;
      font-weight: 600;
    }

    /* Dividers */
    hr {
      border: 0;
      height: 1px;
      background: #E5E7EB;
      margin: 18px 0;
    }

    /* Page-break avoidance */
    .scenario-block {
      page-break-inside: avoid;
      margin-bottom: 18px;
    }
  </style>
</head>
<body>
  <!-- Header Branding Banner -->
  <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0B3326; padding-bottom: 12px; margin-bottom: 18px;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="width: 36px; height: 36px; background-color: #0B3326; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
        🌾
      </div>
      <div>
        <div style="font-size: 18px; font-weight: 800; color: #0B3326; line-height: 1.1;">AgroLnk</div>
        <div style="font-size: 11px; color: #059669; font-weight: 600;">Unified B2B Agri-Trade, Escrow & e-NWR Infrastructure</div>
      </div>
    </div>
    <div style="text-align: right;">
      <span style="display: inline-block; background-color: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 9999px; text-transform: uppercase;">
        Official Testing Manual
      </span>
      <div style="font-size: 10px; color: #6B7280; margin-top: 3px;">Release: v2.4 • Verified Demo</div>
    </div>
  </div>

  <!-- Rendered Markdown Body -->
  <div>
    ${contentHtml}
  </div>

  <!-- Document Footer -->
  <div style="margin-top: 24px; padding-top: 10px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; font-size: 10px; color: #9CA3AF;">
    <span>AgroLnk Enterprise Platform • Testing & Demo Operations Guide</span>
    <span>Confidential • Internal Demo & QA Evaluation</span>
  </div>
</body>
</html>`;
}

function convertMdToPdf(mdFilePath, outputPdfPath, title, subtitle) {
  const mdContent = fs.readFileSync(mdFilePath, 'utf-8');
  
  // Convert Markdown to clean HTML with marked
  const parsedHtml = marked.parse(mdContent);
  const fullHtml = wrapInExecutiveTemplate(parsedHtml, title, subtitle);
  
  const tempHtmlPath = path.join(__dirname, `temp_${path.basename(outputPdfPath, '.pdf')}.html`);
  fs.writeFileSync(tempHtmlPath, fullHtml, 'utf-8');

  const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const fileUrl = `file:///${tempHtmlPath.replace(/\\/g, '/')}`;

  console.log(`Generating High-Quality PDF: ${outputPdfPath}...`);
  
  try {
    const cmd = `"${edgeExe}" --headless --disable-gpu --run-all-compositor-stages-before-draw --no-pdf-header-footer --print-to-pdf="${outputPdfPath}" "${fileUrl}"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✓ Successfully created: ${outputPdfPath}`);
  } catch (err) {
    console.error(`Error creating PDF for ${outputPdfPath}:`, err);
  } finally {
    if (fs.existsSync(tempHtmlPath)) {
      fs.unlinkSync(tempHtmlPath);
    }
  }
}

// 1. Generate Master Testing Demo Guide PDF
convertMdToPdf(
  path.join(__dirname, 'TESTING_DEMO_GUIDE.md'),
  path.join(__dirname, 'AgroLnk_Master_Testing_Demo_Manual.pdf'),
  'AgroLnk — Complete Production Demo & Testing Manual',
  'Step-by-Step Interactive Guide for QA Testers & Stakeholder Demonstrations'
);

// 2. Generate Warehouse Testing Guide PDF
convertMdToPdf(
  path.join(__dirname, 'WAREHOUSE_TESTING_GUIDE.md'),
  path.join(__dirname, 'AgroLnk_Warehouse_Testing_Guide.pdf'),
  'AgroLnk — Warehouse & e-NWR Workflow Testing Manual',
  'WDRA Accredited Electronic Title, Multi-Chamber Storage & 75% LTV Financing'
);

console.log('🎉 All high-fidelity PDFs generated successfully with marked parser!');
