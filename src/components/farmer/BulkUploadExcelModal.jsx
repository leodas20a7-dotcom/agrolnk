import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  Layers,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { bulkCreateListings } from '../../utils/listings';
import { toast } from '../../context/ToastContext';

export default function BulkUploadExcelModal({ isOpen, onClose, currentUser, onSuccess }) {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [detectedExtraCols, setDetectedExtraCols] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const fileInputRef = useRef(null);

  const knownKeys = new Set([
    'commodity', 'crop', 'product', 'produce', 'grain', 'item', 'commodity name',
    'variety', 'type',
    'grade', 'quality',
    'quantity', 'qty', 'weight', 'volume', 'amount', 'lot quantity',
    'unit', 'uom',
    'price', 'rate', 'unit price', 'spot price', 'price per unit',
    'state', 'region', 'province',
    'district', 'city', 'location', 'mandi', 'market',
    'village', 'farmgate',
    'image', 'images', 'image url', 'photo', 'picture', 'url',
    'description', 'notes', 'remarks', 'details', 'specs', 'specifications'
  ]);

  const standardColumns = [
    { name: 'Commodity', required: true, example: 'Maize, Yellow Peas, Chana (any name)' },
    { name: 'Quantity', required: true, example: '100, 250, 500' },
    { name: 'Price', required: true, example: '2700, 4200 (₹ per unit)' },
    { name: 'Unit', required: false, example: 'MT, Qtl, kg (default: MT)' },
    { name: 'Variety', required: false, example: 'FAQ, Desi, Hybrid' },
    { name: 'Grade', required: false, example: 'FAQ, Grade A, Premium' },
    { name: 'State', required: false, example: 'Maharashtra, Madhya Pradesh' },
    { name: 'District', required: false, example: 'Chhatrapati Sambhajinagar, Indore' },
    { name: 'Image URL', required: false, example: 'https://... (Auto-filled if empty)' },
  ];

  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        Commodity: 'Yellow Peas',
        Variety: 'Canadian Bold',
        Grade: 'Grade A',
        Quantity: 250,
        Unit: 'MT',
        Price: 4200,
        State: 'Madhya Pradesh',
        District: 'Indore',
        Moisture: '10.5%',
        Packaging: '50kg PP Bags',
        'Image URL': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800'
      },
      {
        Commodity: 'Maize de oiled cake DOC',
        Variety: 'Yellow Corn Byproduct',
        Grade: 'FAQ',
        Quantity: 500,
        Unit: 'MT',
        Price: 2750,
        State: 'Maharashtra',
        District: 'Chhatrapati Sambhajinagar',
        Moisture: '11.8%',
        Packaging: 'Loose Bulk',
        'Image URL': ''
      },
      {
        Commodity: 'Moong Dal Split',
        Variety: 'Desi Polished',
        Grade: 'Premium',
        Quantity: 120,
        Unit: 'MT',
        Price: 8400,
        State: 'Rajasthan',
        District: 'Bikaner',
        Moisture: '11.0%',
        Packaging: '25kg Bags',
        'Image URL': ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produce Listings');
    XLSX.writeFile(workbook, 'agrolnk_produce_bulk_template.xlsx');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const processFile = (inputFile) => {
    setErrorMsg(null);
    setFile(inputFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!Array.isArray(json) || json.length === 0) {
          setErrorMsg('The selected spreadsheet does not contain any data rows.');
          setParsedRows([]);
          return;
        }

        // Find extra columns that will be added to the description
        const extraColsSet = new Set();
        json.forEach((row) => {
          Object.keys(row).forEach((key) => {
            const cleanKey = key.trim().toLowerCase();
            if (!knownKeys.has(cleanKey)) {
              extraColsSet.add(key.trim());
            }
          });
        });

        setDetectedExtraCols(Array.from(extraColsSet));
        setParsedRows(json);
      } catch (err) {
        console.error('Error parsing spreadsheet:', err);
        setErrorMsg('Failed to read the file. Please ensure it is a valid .xlsx, .xls, or .csv document.');
        setParsedRows([]);
      }
    };
    reader.readAsArrayBuffer(inputFile);
  };

  const handleConfirmUpload = async () => {
    if (!parsedRows || parsedRows.length === 0) return;
    setIsProcessing(true);
    setUploadProgress({ current: 0, total: parsedRows.length });

    try {
      const res = await bulkCreateListings(
        currentUser.id,
        currentUser.name || 'Farmer Partner',
        parsedRows,
        (current, total) => {
          setUploadProgress({ current, total });
        }
      );

      toast.success(`Successfully published ${res.count} produce lots to the exchange!`);
      if (onSuccess) {
        await onSuccess();
      }
      handleClose();
    } catch (err) {
      console.error('Bulk upload error:', err);
      setErrorMsg(err.message || 'Failed to upload listings to Supabase.');
      toast.error(err.message || 'Bulk upload failed.');
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  };

  const handleClose = () => {
    if (isProcessing) return;
    setFile(null);
    setParsedRows([]);
    setDetectedExtraCols([]);
    setErrorMsg(null);
    setUploadProgress(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Upload Produce (Excel / CSV)"
      subtitle="Import multiple harvest lots directly to the national exchange"
      icon={FileSpreadsheet}
      iconColor="text-[#10B981]"
      iconBg="bg-emerald-50"
      maxWidth="max-w-3xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#10B981] hover:text-[#059669] transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Sample Excel Template
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              variant="secondary"
              size="sm"
              disabled={isProcessing}
              onClick={handleClose}
              className="px-4 py-2 font-semibold"
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              size="sm"
              disabled={isProcessing || parsedRows.length === 0}
              onClick={handleConfirmUpload}
              icon={Upload}
              iconPosition="left"
              className="px-5 py-2 font-bold cursor-pointer shadow-xs"
            >
              {isProcessing
                ? `Publishing ${uploadProgress ? `(${uploadProgress.current}/${uploadProgress.total})` : '...'}`
                : `Publish All (${parsedRows.length}) Lots`}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-left">

        {/* User-Friendly Disclaimer & Column Guidelines Card */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-[#F2FBF6] via-[#F8FAF8] to-white p-4 space-y-3 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-extrabold text-[#0B3326]">
                  Spreadsheet Column Guidelines & Automatic Data Handling
                </h4>
                <p className="text-[11px] text-[#2D5A47] leading-relaxed">
                  Your Excel file must contain these standard column headers. Any additional columns will be automatically saved in the lot's Description.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuidelines(!showGuidelines)}
              className="text-[#566861] hover:text-[#0B3326] p-1 rounded-lg transition-colors cursor-pointer shrink-0"
              title={showGuidelines ? 'Collapse guidelines' : 'Expand guidelines'}
            >
              {showGuidelines ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showGuidelines && (
            <div className="space-y-3 pt-1 border-t border-emerald-100 animate-in fade-in duration-150">
              {/* Standard Columns Pills Grid */}
              <div>
                <p className="text-[11px] font-bold text-[#0B3326] uppercase tracking-wider mb-2">
                  Recognized Standard Column Names:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {standardColumns.map((col) => (
                    <div
                      key={col.name}
                      className="p-2 rounded-xl bg-white border border-[#E5EDE8] flex flex-col justify-between shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-[#0B3326]">
                          {col.name}
                        </span>
                        {col.required ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800">
                            Required
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-[#F8FAF8] text-[#566861] border border-[#E5EDE8]">
                            Optional
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#566861] mt-1 truncate" title={col.example}>
                        {col.example}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Automatic Description Notice Banner */}
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold text-[11px] text-amber-900">
                    Important: Other Columns Automatically Stored in Description
                  </p>
                  <p className="text-[11px] text-[#566861] leading-relaxed">
                    Except for the standard column names above, <strong>ANY extra column</strong> in your Excel file (e.g., <code className="px-1 py-0.5 bg-white rounded border border-amber-200 text-amber-900 font-mono text-[10px]">Moisture</code>, <code className="px-1 py-0.5 bg-white rounded border border-amber-200 text-amber-900 font-mono text-[10px]">Packaging</code>, <code className="px-1 py-0.5 bg-white rounded border border-amber-200 text-amber-900 font-mono text-[10px]">Warehouse</code>, <code className="px-1 py-0.5 bg-white rounded border border-amber-200 text-amber-900 font-mono text-[10px]">Crop Year</code>, <code className="px-1 py-0.5 bg-white rounded border border-amber-200 text-amber-900 font-mono text-[10px]">Remarks</code>) will be automatically preserved and formatted inside the produce lot's <strong>Description</strong> in Supabase.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Dropzone */}
        {!file ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#10B981]/40 hover:border-[#10B981] bg-[#F2FBF6]/50 hover:bg-[#F2FBF6] rounded-2xl p-7 text-center cursor-pointer transition-all space-y-2.5"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="w-11 h-11 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs text-[#10B981] flex items-center justify-center mx-auto">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0B3326]">
                Click to upload or drag & drop spreadsheet
              </p>
              <p className="text-xs text-[#566861] mt-0.5">
                Supports Microsoft Excel (<code className="font-mono text-emerald-800">.xlsx</code>, <code className="font-mono text-emerald-800">.xls</code>) and CSV (<code className="font-mono text-emerald-800">.csv</code>)
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#0B3326] truncate max-w-xs sm:max-w-md">
                  {file.name}
                </p>
                <p className="text-[11px] text-[#566861]">
                  {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} produce lots detected
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                setFile(null);
                setParsedRows([]);
                setDetectedExtraCols([]);
              }}
              className="p-1.5 text-[#566861] hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Notice */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Extra Columns Notice */}
        {detectedExtraCols.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold">
              <Layers className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Additional Columns Detected (Saving to Description)</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              These extra columns were found in your sheet and will be saved in each lot's <strong>Description</strong>:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {detectedExtraCols.map((col) => (
                <span
                  key={col}
                  className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 text-[10px] font-bold"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Data Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#0B3326] uppercase tracking-wider">
                Preview (First 5 of {parsedRows.length} lots)
              </h4>
              <Badge variant="emerald" size="sm">
                {parsedRows.length} Lots Ready
              </Badge>
            </div>

            <div className="overflow-x-auto border border-[#E5EDE8] rounded-2xl max-h-52">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAF8] text-[#566861] border-b border-[#E5EDE8] sticky top-0">
                  <tr>
                    <th className="p-2.5 font-bold">Commodity</th>
                    <th className="p-2.5 font-bold">Variety / Grade</th>
                    <th className="p-2.5 font-bold">Quantity</th>
                    <th className="p-2.5 font-bold">Price</th>
                    <th className="p-2.5 font-bold">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EDE8] text-[#14211D]">
                  {parsedRows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="hover:bg-[#F2FBF6]/40 transition-colors">
                      <td className="p-2.5 font-bold text-[#0B3326]">
                        {r.Commodity || r.commodity || r.Crop || r.crop || 'Produce'}
                      </td>
                      <td className="p-2.5 text-[#566861]">
                        {r.Variety || r.variety || 'FAQ'} • {r.Grade || r.grade || 'FAQ'}
                      </td>
                      <td className="p-2.5 font-semibold">
                        {r.Quantity || r.quantity || 0} {r.Unit || r.unit || 'MT'}
                      </td>
                      <td className="p-2.5 font-bold text-[#0B3326]">
                        ₹{Number(r.Price || r.price || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 text-[#566861]">
                        {[r.District || r.district, r.State || r.state].filter(Boolean).join(', ') || 'India'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Progress Bar during upload */}
        {isProcessing && uploadProgress && (
          <div className="space-y-2 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
              <span>Publishing Lots to Supabase...</span>
              <span>
                {Math.round((uploadProgress.current / uploadProgress.total) * 100)}% ({uploadProgress.current}/{uploadProgress.total})
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-emerald-200 overflow-hidden">
              <div
                className="h-full bg-[#10B981] transition-all duration-300"
                style={{
                  width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}
