import React, { useState, useEffect, useMemo } from 'react';
import {
  Sprout,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Tag,
  ExternalLink,
  RefreshCw,
  Layers,
  Sparkles,
  Image as ImageIcon,
  FolderTree,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import {
  getAdminCommoditiesList,
  createCommodity,
  updateCommodity,
  deleteCommodity,
} from '../../utils/commodities';
import {
  COMMODITY_GROUPS,
  CATEGORY_FALLBACK_IMAGES,
} from '../../data/commodityTaxonomy';

const GROUP_BADGE_VARIANTS = {
  'Vegetables': 'emerald',
  'Fruits': 'amber',
  'Food Grains / Cereals': 'indigo',
  'Oilseeds': 'sky',
  'Spices': 'rose',
  'Medicinal Plants': 'emerald',
  'Misc / Plantation Crops': 'purple',
  'Agriculture': 'slate',
};

export default function CommoditiesManager({ onNavigate }) {
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All Groups');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Alerts
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    group: 'Vegetables',
    imageUrl: '',
    varieties: [],
  });
  const [varietyInput, setVarietyInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick variety add popover
  const [quickAddTargetId, setQuickAddTargetId] = useState(null);
  const [quickVarietyText, setQuickVarietyText] = useState('');

  const loadCommodities = async () => {
    setLoading(true);
    try {
      const data = await getAdminCommoditiesList();
      setCommodities(data);
    } catch (err) {
      console.error('Failed to load commodities:', err);
      setActionError('Could not load commodities from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommodities();
    const handleUpdate = () => loadCommodities();
    window.addEventListener('agrolnk_commodities_updated', handleUpdate);
    return () => window.removeEventListener('agrolnk_commodities_updated', handleUpdate);
  }, []);

  // Filtered and searched commodities
  const filteredCommodities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return commodities.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.group && c.group.toLowerCase().includes(q)) ||
        (Array.isArray(c.varieties) && c.varieties.some((v) => v.toLowerCase().includes(q)));

      const matchesGroup =
        selectedGroup === 'All Groups' ||
        (c.group && c.group.toLowerCase() === selectedGroup.toLowerCase());

      return matchesSearch && matchesGroup;
    });
  }, [commodities, searchQuery, selectedGroup]);

  // Pagination
  const totalPages = Math.ceil(filteredCommodities.length / pageSize) || 1;
  const paginatedCommodities = useMemo(() => {
    return filteredCommodities.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredCommodities, currentPage, pageSize]);

  // Reset page when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGroup]);

  // Metrics
  const stats = useMemo(() => {
    const totalVarieties = commodities.reduce((acc, c) => acc + (c.varieties?.length || 0), 0);
    const customCount = commodities.filter((c) => c.isCustom).length;
    return {
      totalCommodities: commodities.length,
      totalVarieties,
      totalGroups: COMMODITY_GROUPS.length,
      customCount,
    };
  }, [commodities]);

  // Modal Handlers
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      group: 'Vegetables',
      imageUrl: CATEGORY_FALLBACK_IMAGES['Vegetables'] || '',
      varieties: [],
    });
    setVarietyInput('');
    setActionError('');
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      group: item.group || 'Vegetables',
      imageUrl: item.imageUrl || '',
      varieties: Array.isArray(item.varieties) ? [...item.varieties] : [],
    });
    setVarietyInput('');
    setActionError('');
    setIsAddEditModalOpen(true);
  };

  const handleAddVarietyChip = () => {
    const clean = varietyInput.trim();
    if (!clean) return;
    if (formData.varieties.some((v) => v.toLowerCase() === clean.toLowerCase())) {
      setActionError(`Variety "${clean}" is already added.`);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      varieties: [...prev.varieties, clean],
    }));
    setVarietyInput('');
    setActionError('');
  };

  const handleRemoveVarietyChip = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      varieties: prev.varieties.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleSaveCommodity = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setActionError('Commodity name is required.');
      return;
    }

    setIsSubmitting(true);
    setActionError('');

    try {
      if (editingItem) {
        // Update
        await updateCommodity(editingItem.id, {
          name: formData.name.trim(),
          group: formData.group,
          imageUrl: formData.imageUrl.trim(),
          varieties: formData.varieties,
        });
        setActionSuccess(`Commodity "${formData.name.trim()}" updated successfully.`);
      } else {
        // Create
        await createCommodity({
          name: formData.name.trim(),
          group: formData.group,
          imageUrl: formData.imageUrl.trim(),
          varieties: formData.varieties,
        });
        setActionSuccess(`New commodity "${formData.name.trim()}" added to database catalog.`);
      }

      setIsAddEditModalOpen(false);
      await loadCommodities();
    } catch (err) {
      console.error('Error saving commodity:', err);
      setActionError(err.message || 'Failed to save commodity to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    setActionError('');

    try {
      await deleteCommodity(itemToDelete.id, itemToDelete.name);
      setActionSuccess(`Commodity "${itemToDelete.name}" removed from catalog.`);
      setItemToDelete(null);
      await loadCommodities();
    } catch (err) {
      console.error('Error deleting commodity:', err);
      setActionError(err.message || 'Failed to delete commodity.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickAddVariety = async (commodity) => {
    const clean = quickVarietyText.trim();
    if (!clean) return;

    try {
      const current = Array.isArray(commodity.varieties) ? commodity.varieties : [];
      if (current.some((v) => v.toLowerCase() === clean.toLowerCase())) {
        setActionError(`Variety "${clean}" already exists for ${commodity.name}.`);
        return;
      }
      const updated = [...current, clean];
      await updateCommodity(commodity.id, {
        name: commodity.name,
        group: commodity.group,
        imageUrl: commodity.imageUrl,
        varieties: updated,
      });
      setQuickAddTargetId(null);
      setQuickVarietyText('');
      setActionSuccess(`Added variety "${clean}" to ${commodity.name}.`);
      await loadCommodities();
    } catch (err) {
      console.error('Quick add variety error:', err);
      setActionError('Failed to add variety.');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner & Action Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess('')}
            className="p-1 text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError('')}
            className="p-1 text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-[#E5EDE8] space-y-1 text-left">
          <div className="flex items-center justify-between text-[#566861] text-xs font-semibold">
            <span>Total Commodities</span>
            <Sprout className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-[#0B3326] font-heading">
            {stats.totalCommodities}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">Standard + Custom</div>
        </Card>

        <Card className="p-4 bg-white border border-[#E5EDE8] space-y-1 text-left">
          <div className="flex items-center justify-between text-[#566861] text-xs font-semibold">
            <span>Commercial Varieties</span>
            <Tag className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-700 font-heading">
            {stats.totalVarieties}
          </div>
          <div className="text-[11px] text-amber-800 font-medium">Cultivars Cataloged</div>
        </Card>

        <Card className="p-4 bg-white border border-[#E5EDE8] space-y-1 text-left">
          <div className="flex items-center justify-between text-[#566861] text-xs font-semibold">
            <span>Crop Categories</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 font-heading">
            {stats.totalGroups}
          </div>
          <div className="text-[11px] text-indigo-800 font-medium">Standard Agri Taxonomy</div>
        </Card>

        <Card className="p-4 bg-white border border-[#E5EDE8] space-y-1 text-left">
          <div className="flex items-center justify-between text-[#566861] text-xs font-semibold">
            <span>Custom Additions</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-purple-700 font-heading">
            {stats.customCount}
          </div>
          <div className="text-[11px] text-purple-800 font-medium">User/Admin Registered</div>
        </Card>
      </div>

      {/* Control & Filter Toolbar */}
      <Card className="p-4 sm:p-5 bg-white border border-[#E5EDE8] space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#566861] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search commodity (e.g. Tomato, Cotton, Basmati)..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs text-[#0B3326] placeholder-[#566861]/70 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:bg-white transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Group Filter */}
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="py-2.5 pl-3 pr-8 rounded-xl border border-[#E5EDE8] bg-white text-xs font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981] cursor-pointer"
              >
                <option value="All Groups">All Categories ({commodities.length})</option>
                {COMMODITY_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Add New Commodity Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              icon={Plus}
              iconPosition="left"
              className="font-bold text-xs shrink-0 cursor-pointer"
            >
              Add Commodity
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <Card className="p-12 text-center bg-white border border-[#E5EDE8] space-y-3">
          <RefreshCw className="w-8 h-8 text-[#10B981] animate-spin mx-auto" />
          <p className="text-sm font-bold text-[#0B3326]">Loading Agricultural Commodities...</p>
          <p className="text-xs text-[#566861]">Querying database catalog and commercial varieties...</p>
        </Card>
      ) : filteredCommodities.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-[#E5EDE8] space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <Sprout className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#0B3326]">No Commodities Found</h3>
            <p className="text-xs text-[#566861] max-w-md mx-auto">
              No commodities matched your search query "{searchQuery}" or selected group.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedGroup('All Groups');
            }}
            className="text-xs"
          >
            Clear Filters
          </Button>
        </Card>
      ) : (
        /* TABLE VIEW */
        <Card className="bg-white border border-[#E5EDE8] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF8] text-[#566861] border-b border-[#E5EDE8] font-bold">
                <tr>
                  <th className="py-3.5 px-4 w-16">Photo</th>
                  <th className="py-3.5 px-4">Commodity Name</th>
                  <th className="py-3.5 px-4">Category Group</th>
                  <th className="py-3.5 px-4">Commercial Varieties</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EDE8]">
                {paginatedCommodities.map((item) => {
                  const badgeVariant = GROUP_BADGE_VARIANTS[item.group] || 'slate';
                  const isQuickAddOpen = quickAddTargetId === item.id;
                  const varietiesList = Array.isArray(item.varieties) ? item.varieties : [];

                  return (
                    <tr
                      key={item.id || item.name}
                      className="hover:bg-[#F2FBF6]/50 transition-colors group"
                    >
                      {/* Image Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden border border-[#E5EDE8] shrink-0 relative group/img">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                            onError={(e) => {
                              e.currentTarget.src =
                                CATEGORY_FALLBACK_IMAGES[item.group] || CATEGORY_FALLBACK_IMAGES.Other;
                            }}
                          />
                        </div>
                      </td>

                      {/* Commodity Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#0B3326] text-sm">
                            {item.name}
                          </span>
                          {item.isCustom && (
                            <Badge variant="purple" size="xs">
                              Custom
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-[#566861] font-mono">
                          ID: {item.id}
                        </span>
                      </td>

                      {/* Group Badge */}
                      <td className="py-3 px-4">
                        <Badge variant={badgeVariant} size="sm">
                          {item.group}
                        </Badge>
                      </td>

                      {/* Varieties Tag Cloud */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                          {varietiesList.length > 0 ? (
                            varietiesList.map((v) => (
                              <span
                                key={v}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F2FBF6] border border-[#10B981]/20 text-[#0B3326] text-[11px] font-medium"
                              >
                                {v}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-gray-400 italic">
                              Standard / FAQ Lot
                            </span>
                          )}

                          {/* Quick Add Variety Inline Pill */}
                          {isQuickAddOpen ? (
                            <div className="inline-flex items-center gap-1 bg-white border border-[#10B981] rounded-lg p-0.5 shadow-xs">
                              <input
                                type="text"
                                autoFocus
                                value={quickVarietyText}
                                onChange={(e) => setQuickVarietyText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleQuickAddVariety(item);
                                  if (e.key === 'Escape') setQuickAddTargetId(null);
                                }}
                                placeholder="Variety name..."
                                className="w-24 text-[11px] px-1.5 py-0.5 outline-none font-medium text-[#0B3326]"
                              />
                              <button
                                onClick={() => handleQuickAddVariety(item)}
                                className="px-1.5 py-0.5 bg-[#10B981] text-white rounded text-[10px] font-bold hover:bg-[#059669] cursor-pointer"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => {
                                  setQuickAddTargetId(null);
                                  setQuickVarietyText('');
                                }}
                                className="p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setQuickAddTargetId(item.id);
                                setQuickVarietyText('');
                              }}
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#10B981] hover:text-[#0B3326] bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                              title="Quick add variety"
                            >
                              <Plus className="w-2.5 h-2.5" /> Variety
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg border border-[#E5EDE8] bg-white text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] hover:border-[#10B981] transition-all cursor-pointer"
                            title="Edit Commodity & Varieties"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setItemToDelete(item)}
                            className="p-1.5 rounded-lg border border-[#E5EDE8] bg-white text-rose-500 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 transition-all cursor-pointer"
                            title="Delete Commodity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-[#E5EDE8] bg-[#F8FAF8]">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredCommodities.length}
              itemsPerPage={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        </Card>
      )}

      {/* ADD / EDIT COMMODITY MODAL */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingItem ? `Edit Commodity: ${editingItem.name}` : 'Add New Agricultural Commodity'}
        subtitle={
          editingItem
            ? 'Update commodity name, category, image URL, and commercial varieties.'
            : 'Register a new commodity and its commercial varieties into the master platform catalog.'
        }
        icon={Sprout}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveCommodity} className="space-y-5 text-left p-1">
          {actionError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Commodity Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] flex items-center justify-between">
              <span>Commodity Name *</span>
              <span className="text-[10px] text-[#566861] font-normal">e.g. Tomato, Avocado, Basmati Paddy</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter agricultural produce name..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs text-[#0B3326] font-semibold focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:bg-white"
            />
          </div>

          {/* Group / Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] flex items-center justify-between">
              <span>Crop Category Group *</span>
              <span className="text-[10px] text-[#566861] font-normal">Determines taxonomy grouping</span>
            </label>
            <select
              value={formData.group}
              onChange={(e) => {
                const newGroup = e.target.value;
                setFormData({
                  ...formData,
                  group: newGroup,
                  imageUrl: formData.imageUrl || CATEGORY_FALLBACK_IMAGES[newGroup] || '',
                });
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981] cursor-pointer"
            >
              {COMMODITY_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Image URL & Live Preview */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0B3326] flex items-center justify-between">
              <span>Produce Image URL</span>
              <span className="text-[10px] text-[#566861] font-normal">Direct image link (Unsplash, CDN)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs text-[#0B3326] font-mono focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:bg-white"
              />
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    imageUrl: CATEGORY_FALLBACK_IMAGES[formData.group] || '',
                  })
                }
                className="px-3 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-bold text-[#566861] hover:text-[#0B3326] hover:bg-[#E5EDE8] transition-colors whitespace-nowrap cursor-pointer"
              >
                Use Fallback
              </button>
            </div>

            {/* Thumbnail Live Preview */}
            {formData.imageUrl && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] mt-2">
                <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden border border-[#E5EDE8] shrink-0">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        CATEGORY_FALLBACK_IMAGES[formData.group] || CATEGORY_FALLBACK_IMAGES.Other;
                    }}
                  />
                </div>
                <div className="text-[11px] text-[#566861] overflow-hidden">
                  <div className="font-bold text-[#0B3326]">Live Image Preview</div>
                  <div className="truncate text-gray-400 font-mono text-[10px]">
                    {formData.imageUrl}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Commercial Varieties Manager */}
          <div className="space-y-2 pt-2 border-t border-[#E5EDE8]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Commercial Varieties / Cultivars ({formData.varieties.length})</span>
              </label>
              <span className="text-[10px] text-[#566861]">Type and press Enter or click Add</span>
            </div>

            {/* Variety Input Row */}
            <div className="flex gap-2">
              <input
                type="text"
                value={varietyInput}
                onChange={(e) => setVarietyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddVarietyChip();
                  }
                }}
                placeholder="e.g. Shivam, PKM 1, Arka Rakshak..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs text-[#0B3326] font-medium focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:bg-white"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddVarietyChip}
                icon={Plus}
                iconPosition="left"
                className="text-xs font-bold shrink-0 cursor-pointer"
              >
                Add Variety
              </Button>
            </div>

            {/* Varieties Tag Cloud in Form */}
            <div className="p-3 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] min-h-[70px] max-h-48 overflow-y-auto">
              {formData.varieties.length === 0 ? (
                <div className="text-center py-3 text-xs text-gray-400 italic">
                  No specific commercial varieties added yet. (Farmers can choose "Standard / FAQ Lot")
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {formData.varieties.map((v, idx) => (
                    <span
                      key={v + idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#10B981]/30 text-[#0B3326] text-xs font-semibold shadow-2xs group"
                    >
                      <span>{v}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveVarietyChip(idx)}
                        className="text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title={`Remove ${v}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5EDE8]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAddEditModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmitting}
              className="text-xs font-bold cursor-pointer"
            >
              {editingItem ? 'Save Changes' : 'Create Commodity'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        title="Confirm Commodity Deletion"
        subtitle="This action will permanently delete the commodity lot from the platform catalog."
        icon={AlertCircle}
        iconColor="text-rose-600"
        iconBg="bg-rose-50"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-left p-1">
          <p className="text-xs text-[#566861] leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="font-bold text-[#0B3326]">"{itemToDelete?.name}"</span>?
            Farmers and buyers will no longer be able to select this commodity or its associated
            commercial varieties in new listings or auctions.
          </p>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
            Existing active orders and historical trade receipts for this commodity will retain their
            data integrity.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5EDE8]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setItemToDelete(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              loading={isDeleting}
              className="text-xs font-bold cursor-pointer"
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
