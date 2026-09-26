import React, { useState, useEffect } from 'react';
import { Link2, Plus, Search, ExternalLink, Sparkles, Globe } from 'lucide-react';
import { getAllLinks, addLink, updateLink, deleteLink, normalizeUrl } from '../storage/linkStore';
import LinkCard from '../components/LinkCard';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import './Links.css';

const PRESET_SUGGESTIONS = [
  { title: 'GitHub', url: 'https://github.com', category: 'Development', description: 'Code repositories and open source projects' },
  { title: 'ChatGPT', url: 'https://chatgpt.com', category: 'AI Assistant', description: 'AI study companion and coding assistance' },
  { title: 'Google', url: 'https://google.com', category: 'Research', description: 'Search engine for academic resources' },
  { title: 'YouTube', url: 'https://youtube.com', category: 'Video Lectures', description: 'Video lectures and tutorials' },
  { title: 'Coursera', url: 'https://coursera.org', category: 'Courses', description: 'Online university courses and certifications' },
  { title: 'Stack Overflow', url: 'https://stackoverflow.com', category: 'Development', description: 'Programming Q&A and debugging' }
];

const Links = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    url: '',
    category: 'General',
    description: ''
  });

  const loadLinks = async () => {
    setLoading(true);
    try {
      const data = await getAllLinks();
      setLinks(data);
    } catch (err) {
      console.error('Failed to load links', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const categories = ['all', ...Array.from(new Set(links.map(l => l.category).filter(Boolean)))];

  const filteredLinks = links.filter(link => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      link.title.toLowerCase().includes(q) ||
      link.url.toLowerCase().includes(q) ||
      (link.category && link.category.toLowerCase().includes(q)) ||
      (link.description && link.description.toLowerCase().includes(q));

    const matchesCategory = selectedCategory === 'all' || link.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const openAddModal = (preset = null) => {
    if (preset) {
      setFormData({
        title: preset.title,
        url: preset.url,
        category: preset.category || 'General',
        description: preset.description || ''
      });
    } else {
      setFormData({
        title: '',
        url: '',
        category: 'General',
        description: ''
      });
    }
    setEditingLink(null);
    setIsModalOpen(true);
  };

  const openEditModal = (link) => {
    setFormData({
      title: link.title,
      url: link.url,
      category: link.category || 'General',
      description: link.description || ''
    });
    setEditingLink(link);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.url.trim()) return;

    try {
      if (editingLink) {
        await updateLink(editingLink.id, formData);
      } else {
        await addLink(formData);
      }
      setIsModalOpen(false);
      setEditingLink(null);
      await loadLinks();
    } catch (err) {
      console.error('Failed to save link', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteLink(deleteConfirmId);
      setDeleteConfirmId(null);
      await loadLinks();
    } catch (err) {
      console.error('Failed to delete link', err);
    }
  };

  const handleQuickAdd = async (preset) => {
    // Check if already in list
    const existing = links.find(l => normalizeUrl(l.url) === normalizeUrl(preset.url));
    if (existing) {
      // If it exists, just open it or highlight
      window.open(existing.url, '_blank', 'noopener,noreferrer');
      return;
    }
    openAddModal(preset);
  };

  if (loading) {
    return <div className="p-8">Loading study links...</div>;
  }

  return (
    <div className="links-page-container fade-in">
      <header className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Links</h1>
          <p className="text-secondary">Quick access to websites you use frequently for your studies.</p>
        </div>
        <div className="links-header-actions">
          <button className="btn btn-primary" onClick={() => openAddModal()}>
            <Plus size={18} />
            <span>Add Link</span>
          </button>
        </div>
      </header>

      {/* Quick suggestions bar */}
      <div className="links-quick-bar">
        <span className="quick-bar-label">
          <Sparkles size={14} color="var(--accent)" /> Popular Study Sites:
        </span>
        {PRESET_SUGGESTIONS.map(preset => {
          const isAdded = links.some(l => normalizeUrl(l.url) === normalizeUrl(preset.url));
          return (
            <button
              key={preset.title}
              type="button"
              className="quick-suggestion-btn"
              onClick={() => handleQuickAdd(preset)}
              title={isAdded ? `Visit ${preset.title}` : `Add ${preset.title}`}
            >
              {isAdded ? <ExternalLink size={12} /> : <Plus size={12} />}
              <span>{preset.title}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar: Search and Filter */}
      <div className="links-toolbar">
        <div className="links-search-box">
          <Search size={18} className="links-search-icon" />
          <input
            type="text"
            className="links-search-input"
            placeholder="Search links by name, URL, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="links-filter-controls">
          <select
            className="links-category-select select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Links Grid */}
      {links.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No links yet"
          description="Save websites that you use frequently for your studies like GitHub, ChatGPT, Google, or Coursera."
          actionLabel="+ Add Your First Link"
          onAction={() => openAddModal()}
        />
      ) : filteredLinks.length === 0 ? (
        <div className="text-center py-12 text-secondary">
          No study links match your search "{searchQuery}".
        </div>
      ) : (
        <div className="links-grid">
          {filteredLinks.map(link => (
            <LinkCard
              key={link.id}
              link={link}
              onEdit={openEditModal}
              onDelete={(id) => setDeleteConfirmId(id)}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        title={editingLink ? 'Edit Link' : 'Add New Link'}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleModalSubmit}>
          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-2">Website Name / Title *</label>
            <input
              type="text"
              className="input w-full"
              placeholder="e.g. GitHub, ChatGPT, YouTube"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              autoFocus
              required
            />
          </div>

          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-2">Website URL *</label>
            <input
              type="text"
              className="input w-full"
              placeholder="e.g. https://github.com or chatgpt.com"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              required
            />
            <p className="text-xs text-muted mt-1">
              Protocols like https:// will be automatically added if omitted.
            </p>
          </div>

          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-2">Category (Optional)</label>
            <input
              type="text"
              className="input w-full"
              placeholder="e.g. Development, AI Assistant, Research, Courses"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>

          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <textarea
              className="textarea w-full"
              rows={3}
              placeholder="Brief note about what you use this site for..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {!editingLink && (
            <div className="mb-4">
              <span className="text-xs text-muted block mb-1">Or pick a preset to autofill:</span>
              <div className="preset-pills-row">
                {PRESET_SUGGESTIONS.map(p => (
                  <button
                    key={p.title}
                    type="button"
                    className="preset-pill"
                    onClick={() => setFormData({
                      title: p.title,
                      url: p.url,
                      category: p.category,
                      description: p.description
                    })}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingLink ? 'Save Changes' : 'Save Link'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        title="Delete Link"
        message="Are you sure you want to delete this study link? You can always add it again later."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};

export default Links;
