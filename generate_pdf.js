import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple Markdown to HTML converter with AgroLnk styling
function markdownToHtml(md, title) {
  let html = md;

  // Escape HTML characters
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Restore intentional HTML tags if any were in markdown
  html = html.replace(/&lt;br\s*\/?&gt;/gi, '<br/>');

  // Headers
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-3xl font-extrabold text-emerald-950 border-b-2 border-emerald-600 pb-3 mb-6">$1</h1>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-emerald-900 mt-8 mb-4 border-b border-emerald-100 pb-2 flex items-center gap-2">$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-emerald-800 mt-6 mb-3">$1</h3>');
  html = html.replace(/^#### (.+)$/gm, '<h4 class="text-lg font-semibold text-gray-800 mt-4 mb-2">$1</h4>');

  // Bold and Italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-emerald-950">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="italic text-gray-700">$1</em>');

  // Code inline
  html = html.replace(/`([^`]+)`/g, '<code class="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-mono text-sm border border-emerald-200">$1</code>');

  // Horizontal Rules
  html = html.replace(/^---$/gm, '<hr class="my-6 border-gray-200" />');

  // Checklists and list items
  html = html.replace(/^- \[x\] (.+)$/gm, '<li class="flex items-center gap-2 text-gray-800 my-1"><span class="text-emerald-600 font-bold">✓</span> $1</li>');
  html = html.replace(/^- \[ \] (.+)$/gm, '<li class="flex items-center gap-2 text-gray-800 my-1"><span class="text-gray-400">◻</span> $1</li>');
  html = html.replace(/^\* (.+)$/gm, '<li class="ml-4 list-disc text-gray-700 my-1">$1</li>');
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-700 my-1">$1</li>');

  // Code blocks (ASCII diagrams / code)
  html = html.replace(/```([\s\S]*?)```/gm, '<pre class="bg-emerald-950 text-emerald-200 p-4 rounded-xl my-4 text-xs font-mono overflow-x-auto shadow-inner leading-relaxed">$1</pre>');

  // Markdown Tables
  const tableRegex = /\|(.+)\|\n\|[-|\s]+\|\n((?:\|.+\|\n?)+)/g;
  html = html.replace(tableRegex, (match, headerRow, bodyRows) => {
    const headers = headerRow.split('|').map(h => h.trim()).filter(Boolean);
    const ths = headers.map(h => `<th class="px-4 py-2.5 bg-emerald-800 text-white font-semibold text-left text-xs uppercase tracking-wider">${h}</th>`).join('');

    const rows = bodyRows.trim().split('\n').map(row => {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean);
      const tds = cells.map(c => `<td class="px-4 py-2.5 text-xs text-gray-700 border-b border-gray-100">${c}</td>`).join('');
      return `<tr class="hover:bg-emerald-50/50 transition-colors">${tds}</tr>`;
    }).join('');

    return `<div class="my-5 overflow-hidden rounded-xl border border-gray-200 shadow-sm"><table class="w-full border-collapse">${ths}<tbody>${rows}</tbody></table></div>`;
  });

  // Paragraphs
  html = html.split('\n\n').map(para => {
    if (para.startsWith('<') || para.startsWith('|') || !para.trim()) return para;
    return `<p class="text-sm text-gray-700 leading-relaxed mb-3">${para}</p>`;
  }).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page {
      margin: 14mm 14mm 14mm 14mm;
      size: A4 portrait;
    }
    pre, code {
      font-family: 'JetBrains Mono', monospace;
    }
    table {
      page-break-inside: avoid;
    }
    tr {
      page-break-inside: avoid;
    }
    h1, h2, h3 {
      page-break-after: avoid;
    }
  </style>
</head>
<body class="bg-white text-gray-900 p-8 max-w-4xl mx-auto">
  <!-- Header Branding Banner -->
  <div class="flex items-center justify-between pb-6 mb-6 border-b-2 border-emerald-700">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-emerald-900 text-white flex items-center justify-center font-bold text-xl shadow">
        🌾
      </div>
      <div>
        <h1 class="text-xl font-extrabold text-emerald-950 tracking-tight m-0">AgroLnk Enterprise</h1>
        <p class="text-xs text-emerald-700 font-semibold m-0">B2B Agricultural Commerce, Escrow & e-NWR Infrastructure</p>
      </div>
    </div>
    <div class="text-right">
      <span class="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-300">Official Testing Manual</span>
      <p class="text-[11px] text-gray-500 mt-1">Generated: September 2026</p>
    </div>
  </div>

  <div class="prose max-w-none">
    ${html}
  </div>

  <!-- Footer -->
  <div class="mt-12 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400">
    <span>AgroLnk Platform Documentation • Confidential & Proprietary</span>
    <span>Page 1 / 1</span>
  </div>
</body>
</html>`;
}

function convertMdToPdf(mdFilePath, outputPdfPath, title) {
  const mdContent = fs.readFileSync(mdFilePath, 'utf-8');
  const htmlContent = markdownToHtml(mdContent, title);
  
  const tempHtmlPath = path.join(__dirname, `temp_${path.basename(outputPdfPath, '.pdf')}.html`);
  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8');

  const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const fileUrl = `file:///${tempHtmlPath.replace(/\\/g, '/')}`;

  console.log(`Generating PDF: ${outputPdfPath}...`);
  
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

// 1. Generate Warehouse Testing Guide PDF
convertMdToPdf(
  path.join(__dirname, 'WAREHOUSE_TESTING_GUIDE.md'),
  path.join(__dirname, 'AgroLnk_Warehouse_Testing_Guide.pdf'),
  'AgroLnk — Warehouse & e-NWR Workflow Testing Manual'
);

// 2. Generate Master Testing Demo Guide PDF
convertMdToPdf(
  path.join(__dirname, 'TESTING_DEMO_GUIDE.md'),
  path.join(__dirname, 'AgroLnk_Master_Testing_Demo_Manual.pdf'),
  'AgroLnk — Complete Production Demo & Testing Manual'
);

console.log('🎉 All PDFs generated successfully!');
