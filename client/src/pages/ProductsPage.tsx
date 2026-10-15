import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Upload,
  Sparkles,
  Search,
  Trash2,
  Edit2,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  TrendingUp,
} from 'lucide-react';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  importProductsCsv,
  seedDemoData,
  clearDemoData,
  Product,
} from '../services/api';
import EmptyState from '../components/EmptyState';
import DemoBadge from '../components/DemoBadge';
import Badge from '../components/Badge';
import { useI18n } from '../context/I18nContext';

export const ProductsPage: React.FC = () => {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);


  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'general',
    price_lkr: '',
    cost_lkr: '',
    stock_qty: '10',
    description: '',
  });

  // CSV Import state
  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetchProducts();
      if (res.success && res.products) {
        setProducts(res.products);
      }
    } catch (err: any) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'general',
      price_lkr: '',
      cost_lkr: '',
      stock_qty: '10',
      description: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      category: prod.category || 'general',
      price_lkr: prod.price_lkr.toString(),
      cost_lkr: prod.cost_lkr !== null && prod.cost_lkr !== undefined ? prod.cost_lkr.toString() : '',
      stock_qty: prod.stock_qty.toString(),
      description: prod.description || '',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price_lkr) {
      showNotification('Name and Price are required', 'error');
      return;
    }

    try {
      if (editingProduct) {
        const res = await updateProduct(editingProduct.id, {
          name: formData.name,
          category: formData.category,
          price_lkr: parseFloat(formData.price_lkr),
          cost_lkr: formData.cost_lkr ? parseFloat(formData.cost_lkr) : null,
          stock_qty: parseInt(formData.stock_qty, 10) || 0,
          description: formData.description,
        });
        if (res.success) {
          showNotification('Product updated successfully!');
          setIsAddModalOpen(false);
          loadProducts();
        } else {
          showNotification(res.error || 'Failed to update product', 'error');
        }
      } else {
        const res = await createProduct({
          name: formData.name,
          category: formData.category,
          price_lkr: parseFloat(formData.price_lkr),
          cost_lkr: formData.cost_lkr ? parseFloat(formData.cost_lkr) : null,
          stock_qty: parseInt(formData.stock_qty, 10) || 0,
          description: formData.description,
        });
        if (res.success) {
          showNotification('Product added to catalog!');
          setIsAddModalOpen(false);
          loadProducts();
        } else {
          showNotification(res.error || 'Failed to create product', 'error');
        }
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await deleteProduct(id);
      if (res.success) {
        showNotification(`Deleted "${name}"`);
        loadProducts();
      } else {
        showNotification(res.error || 'Failed to delete product', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleSeedDemo = async () => {
    setLoading(true);
    try {
      const res = await seedDemoData();
      if (res.success) {
        showNotification(`Seeded ${res.productsCount} authentic Sri Lankan retail products with sales records!`);
        loadProducts();
      } else {
        showNotification(res.error || 'Failed to seed demo data', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearDemo = async () => {
    if (!confirm('Clear all sample demo products from your catalog?')) return;
    setLoading(true);
    try {
      const res = await clearDemoData();
      if (res.success) {
        showNotification(`Cleared ${res.deletedCount} demo products.`);
        loadProducts();
      } else {
        showNotification(res.error || 'Failed to clear demo data', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImportCsv = async () => {
    if (!csvText.trim()) {
      showNotification('Please paste CSV text or select a file', 'error');
      return;
    }
    setIsImporting(true);
    try {
      const res = await importProductsCsv(csvText);
      if (res.success) {
        showNotification(`Successfully imported ${res.count} products!`);
        setIsImportModalOpen(false);
        setCsvText('');
        loadProducts();
      } else {
        showNotification(res.error || 'Failed to import CSV', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/products/import/template';
  };

  // Categories list
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category || 'general')))];

  // Filtered list
  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate live margin preview in modal
  const livePrice = parseFloat(formData.price_lkr);
  const liveCost = parseFloat(formData.cost_lkr);
  const liveMargin =
    !isNaN(livePrice) && livePrice > 0 && !isNaN(liveCost) && liveCost >= 0
      ? (((livePrice - liveCost) / livePrice) * 100).toFixed(1)
      : null;

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.875rem 1.25rem',
            borderRadius: '0.75rem',
            backgroundColor: notification.type === 'success' ? '#065f46' : '#991b1b',
            color: '#ffffff',
            boxShadow: 'var(--shadow-xl)',
            fontSize: '0.875rem',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 className="title-hero">📦 {t('products.title')}</h1>
          <p className="subtitle-hero">
            {t('products.subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          <button onClick={handleSeedDemo} className="btn btn-secondary" title="Load 8 sample Sri Lankan products">
            <Sparkles size={16} color="#059669" />
            <span>{t('settings.seedBtn')}</span>
          </button>
          <button onClick={() => setIsImportModalOpen(true)} className="btn btn-secondary">
            <Upload size={16} />
            <span>{t('products.importCsv')}</span>
          </button>
          <button onClick={handleOpenAddModal} className="btn btn-primary">
            <Plus size={16} />
            <span>{t('products.addProduct')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input
              type="text"
              placeholder={t('products.searchPlaceholder')}
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          {/* Category Chips */}
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: selectedCategory === cat ? 700 : 500,
                  borderRadius: '9999px',
                  border: '1px solid',
                  borderColor: selectedCategory === cat ? 'var(--primary-600)' : 'var(--border-medium)',
                  backgroundColor: selectedCategory === cat ? 'var(--primary-50)' : 'transparent',
                  color: selectedCategory === cat ? 'var(--primary-800)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat === 'all' ? t('products.allCategories') : cat}
              </button>
            ))}
          </div>

          {/* Demo cleanup link */}
          {products.some(p => p.is_demo) && (
            <button
              onClick={handleClearDemo}
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {t('settings.clearBtn')}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid var(--border-light)',
              borderTopColor: '#059669',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          {t('common.loading')}
        </div>
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={<Package size={28} />}
          title={search ? 'No products match your search' : t('products.emptyTitle')}
          description={
            search
              ? 'Try adjusting your search terms or category filter.'
              : t('products.emptyDesc')
          }
          actionText={search ? undefined : t('settings.seedBtn')}
          onAction={search ? undefined : handleSeedDemo}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t('products.colProduct')}</th>
                <th>{t('products.colCategory')}</th>
                <th style={{ textAlign: 'right' }}>{t('products.colPrice')}</th>
                <th style={{ textAlign: 'right' }}>{t('products.colCost')}</th>
                <th style={{ textAlign: 'center' }}>{t('products.colStock')}</th>
                <th style={{ textAlign: 'right' }}>30d Sales</th>
                <th style={{ textAlign: 'center' }}>{t('products.colActions')}</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((p) => {
                const stockNum = p.stock_qty;
                const isOutOfStock = stockNum <= 0;
                const isLowStock = stockNum > 0 && stockNum <= 10;

                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {p.name}
                            {p.is_demo && <DemoBadge />}
                          </div>
                          {p.description && (
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                maxWidth: '380px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {p.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge variant="gray" className="capitalize">
                        {p.category || 'general'}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      Rs. {Number(p.price_lkr).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {p.cost_lkr ? (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Rs. {Number(p.cost_lkr).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          {p.margin_pct !== null && (
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                color: Number(p.margin_pct) >= 40 ? '#059669' : '#b45309',
                              }}
                            >
                              {p.margin_pct}% margin
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={`badge ${
                          isOutOfStock ? 'badge-rose' : isLowStock ? 'badge-gold' : 'badge-green'
                        }`}
                      >
                        {isOutOfStock ? 'Out of stock' : isLowStock ? `Low: ${stockNum}` : `${stockNum} in stock`}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {p.total_units_sold && Number(p.total_units_sold) > 0 ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary-700)', fontWeight: 600 }}>
                          <TrendingUp size={14} />
                          <span>{p.total_units_sold} units</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>0</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          title="Edit Product"
                          style={{
                            padding: '0.375rem',
                            borderRadius: '0.375rem',
                            border: '1px solid var(--border-light)',
                            background: '#ffffff',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          title="Delete Product"
                          style={{
                            padding: '0.375rem',
                            borderRadius: '0.375rem',
                            border: '1px solid #fecdd3',
                            background: '#fff1f2',
                            cursor: 'pointer',
                            color: '#e11d48',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── ADD / EDIT PRODUCT MODAL ───────────────────────── */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'clamp(0.75rem, 3vw, 1.5rem)',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1.25rem',
              width: '100%',
              maxWidth: '520px',
              padding: 'clamp(1rem, 3.5vw, 2rem)',
              maxHeight: '90dvh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ceylon Cinnamon Sticks (100g)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="general">General Retail</option>
                    <option value="spices">Spices</option>
                    <option value="clothing">Clothing & Apparel</option>
                    <option value="groceries">Groceries & Food</option>
                    <option value="tea">Ceylon Tea</option>
                    <option value="handicrafts">Crafts & Souvenirs</option>
                    <option value="cosmetics">Health & Beauty</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Stock Quantity</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.stock_qty}
                    onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                    min="0"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Selling Price (LKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="1850.00"
                    value={formData.price_lkr}
                    onChange={(e) => setFormData({ ...formData, price_lkr: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Cost per Unit (LKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="950.00"
                    value={formData.cost_lkr}
                    onChange={(e) => setFormData({ ...formData, cost_lkr: e.target.value })}
                  />
                </div>
              </div>

              {/* Profit margin live feedback */}
              {liveMargin && (
                <div
                  style={{
                    backgroundColor: 'var(--primary-50)',
                    border: '1px solid var(--primary-200)',
                    borderRadius: '0.5rem',
                    padding: '0.625rem 0.875rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                  }}
                >
                  <span style={{ color: 'var(--primary-900)', fontWeight: 600 }}>Estimated Gross Margin:</span>
                  <span style={{ color: '#047857', fontWeight: 800 }}>{liveMargin}%</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Description / Unique Selling Points</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Harvested from Southern province, high essential oil content, export grade..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CSV IMPORT MODAL ───────────────────────────────── */}
      {isImportModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'clamp(0.75rem, 3vw, 1.5rem)',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1.25rem',
              width: '100%',
              maxWidth: '560px',
              padding: 'clamp(1rem, 3.5vw, 2rem)',
              maxHeight: '90dvh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={20} color="#059669" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Import Products from CSV</h2>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Upload a spreadsheet or paste CSV text with columns: <strong>Name, Category, Price_LKR, Cost_LKR, Stock_Qty, Description</strong>.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="btn btn-secondary btn-sm"
              >
                <Download size={14} /> Download Sample CSV
              </button>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                <Upload size={14} /> Choose File
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Or Paste CSV Data Below</label>
              <textarea
                className="form-textarea"
                rows={8}
                placeholder={`Name,Category,Price_LKR,Cost_LKR,Stock_Qty,Description\n"Ceylon Cinnamon (100g)","spices",1850,950,40,"Pure alba quills"`}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportCsv}
                className="btn btn-primary"
                disabled={isImporting}
              >
                {isImporting ? 'Importing rows...' : 'Import Catalog'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
