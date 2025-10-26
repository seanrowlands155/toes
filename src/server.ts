import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import nunjucks from 'nunjucks';
import { existsSync } from 'fs';
import { store } from './data/store';
import { Product } from './data/models';

const app = express();
const port = process.env.PORT || 3000;

const viewsDir = (() => {
  const distPath = path.join(__dirname, 'views');
  if (existsSync(distPath)) {
    return distPath;
  }
  const fallback = path.join(process.cwd(), 'src', 'views');
  return fallback;
})();

const publicDir = (() => {
  const distPath = path.join(__dirname, 'public');
  if (existsSync(distPath)) {
    return distPath;
  }
  return path.join(process.cwd(), 'src', 'public');
})();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(publicDir));

nunjucks.configure(viewsDir, {
  autoescape: true,
  express: app
});

app.locals.store = store;

// Seed demo data if empty
if (store.listCategories().length === 0) {
  const apparel = store.createCategory('Apparel', 'Clothing for everyday wear');
  const accessories = store.createCategory('Accessories');
  store.createProduct({
    name: 'Organic Cotton T-Shirt',
    description: 'Soft and sustainable t-shirt made from 100% organic cotton.',
    price: 29.99,
    currency: 'USD',
    media: [
      {
        id: 'hero',
        url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80',
        altText: 'Model wearing a white cotton t-shirt'
      }
    ],
    additionalInfo: {
      Fabric: '100% organic cotton',
      Fit: 'Relaxed fit',
      Care: 'Machine wash cold'
    },
    categoryIds: [apparel.id],
    customTemplate: ''
  });
  store.createProduct({
    name: 'Leather Weekender Bag',
    description: 'Handcrafted leather weekender bag with brass hardware.',
    price: 249.99,
    currency: 'USD',
    media: [
      {
        id: 'hero',
        url: 'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1200&q=80',
        altText: 'Leather travel bag on a bench'
      }
    ],
    additionalInfo: {
      Material: 'Full-grain leather',
      Warranty: 'Lifetime craftsmanship guarantee'
    },
    categoryIds: [accessories.id],
    customTemplate: ''
  });
  store.createPage({
    title: 'About Our Craft',
    content:
      '<h2>Handmade with care</h2><p>Each product is crafted by artisans using sustainable materials.</p>',
    template: 'custom-page.njk'
  });
}

const ensureArray = <T>(value: T | T[] | undefined): T[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'undefined') return [];
  return [value];
};

const parseAdditionalInfo = (keys: string[] | string, values: string[] | string) => {
  const info: Record<string, string> = {};
  const keyList = ensureArray(keys);
  const valueList = ensureArray(values);
  keyList.forEach((key, index) => {
    const trimmedKey = key.trim();
    if (!trimmedKey) return;
    info[trimmedKey] = valueList[index] ?? '';
  });
  return info;
};

app.get('/', (_req, res) => {
  const products = store.listProducts();
  const categories = store.listCategories();
  res.render('products/list.njk', { products, categories, settings: store.getSettings() });
});

app.get('/products/:slug', (req, res) => {
  const product = store.listProducts().find((item) => item.slug === req.params.slug);
  if (!product) {
    return res.status(404).render('errors/404.njk');
  }
  const template = product.customTemplate ? `products/custom/${product.customTemplate}` : 'products/detail.njk';
  res.render(template, { product, settings: store.getSettings(), categories: store.listCategories() });
});

app.get('/pages/:slug', (req, res) => {
  const page = store.getPageBySlug(req.params.slug);
  if (!page) {
    return res.status(404).render('errors/404.njk');
  }
  res.render(`pages/${page.template}`, { page, settings: store.getSettings() });
});

app.get('/admin', (_req, res) => {
  res.render('admin/dashboard.njk', {
    products: store.listProducts(),
    categories: store.listCategories(),
    pages: store.listPages(),
    settings: store.getSettings()
  });
});

app.get('/admin/products/new', (_req, res) => {
  res.render('admin/product-form.njk', {
    product: null,
    categories: store.listCategories(),
    action: '/admin/products'
  });
});

app.post('/admin/products', (req, res) => {
  const additionalInfo = parseAdditionalInfo(req.body.additionalInfoKey, req.body.additionalInfoValue);
  const mediaUrls = ensureArray(req.body.mediaUrl);
  const mediaAltTexts = ensureArray(req.body.mediaAltText);
  const media = mediaUrls
    .filter((url) => url && url.trim().length > 0)
    .map((url: string, index: number) => ({
      id: `media-${index}-${Date.now()}`,
      url,
      altText: mediaAltTexts[index] || ''
    }));

  const product: Omit<Product, 'id' | 'slug'> & { slug?: string } = {
    name: req.body.name,
    description: req.body.description,
    price: parseFloat(req.body.price),
    currency: req.body.currency,
    media,
    additionalInfo,
    categoryIds: ensureArray(req.body.categoryIds).filter(Boolean),
    customTemplate: req.body.customTemplate || ''
  };

  store.createProduct(product);
  res.redirect('/admin');
});

app.get('/admin/products/:id/edit', (req, res) => {
  const product = store.getProduct(req.params.id);
  if (!product) return res.status(404).render('errors/404.njk');
  res.render('admin/product-form.njk', {
    product,
    categories: store.listCategories(),
    action: `/admin/products/${product.id}`
  });
});

app.post('/admin/products/:id', (req, res) => {
  const additionalInfo = parseAdditionalInfo(req.body.additionalInfoKey, req.body.additionalInfoValue);
  const mediaIds = ensureArray(req.body.mediaId);
  const mediaUrls = ensureArray(req.body.mediaUrl);
  const mediaAltTexts = ensureArray(req.body.mediaAltText);
  const media = mediaUrls
    .filter((url) => url && url.trim().length > 0)
    .map((url: string, index: number) => ({
      id: mediaIds[index] || `media-${index}-${Date.now()}`,
      url,
      altText: mediaAltTexts[index] || ''
    }));

  store.updateProduct(req.params.id, {
    name: req.body.name,
    description: req.body.description,
    price: parseFloat(req.body.price),
    currency: req.body.currency,
    media,
    additionalInfo,
    categoryIds: ensureArray(req.body.categoryIds).filter(Boolean),
    customTemplate: req.body.customTemplate || ''
  });

  res.redirect('/admin');
});

app.post('/admin/products/:id/delete', (req, res) => {
  store.removeProduct(req.params.id);
  res.redirect('/admin');
});

app.get('/admin/categories/new', (_req, res) => {
  res.render('admin/category-form.njk', { category: null, categories: store.listCategories(), action: '/admin/categories' });
});

app.post('/admin/categories', (req, res) => {
  store.createCategory(req.body.name, req.body.description, req.body.parentId || undefined);
  res.redirect('/admin');
});

app.get('/admin/categories/:id/edit', (req, res) => {
  const category = store.getCategory(req.params.id);
  if (!category) return res.status(404).render('errors/404.njk');
  res.render('admin/category-form.njk', { category, categories: store.listCategories(), action: `/admin/categories/${category.id}` });
});

app.post('/admin/categories/:id', (req, res) => {
  store.updateCategory(req.params.id, {
    name: req.body.name,
    description: req.body.description,
    parentId: req.body.parentId || undefined
  });
  res.redirect('/admin');
});

app.post('/admin/categories/:id/delete', (req, res) => {
  store.removeCategory(req.params.id);
  res.redirect('/admin');
});

app.get('/admin/pages/new', (_req, res) => {
  res.render('admin/page-form.njk', {
    page: null,
    action: '/admin/pages',
    templates: ['custom-page.njk']
  });
});

app.post('/admin/pages', (req, res) => {
  store.createPage({
    title: req.body.title,
    content: req.body.content,
    template: req.body.template
  });
  res.redirect('/admin');
});

app.get('/admin/pages/:id/edit', (req, res) => {
  const page = store.listPages().find((item) => item.id === req.params.id);
  if (!page) return res.status(404).render('errors/404.njk');
  res.render('admin/page-form.njk', {
    page,
    action: `/admin/pages/${page.id}`,
    templates: ['custom-page.njk']
  });
});

app.post('/admin/pages/:id', (req, res) => {
  store.updatePage(req.params.id, {
    title: req.body.title,
    content: req.body.content,
    template: req.body.template
  });
  res.redirect('/admin');
});

app.post('/admin/pages/:id/delete', (req, res) => {
  store.removePage(req.params.id);
  res.redirect('/admin');
});

app.get('/admin/settings', (_req, res) => {
  res.render('admin/settings.njk', { settings: store.getSettings() });
});

app.post('/admin/settings', (req, res) => {
  const providers = ensureArray(req.body.gatewayProvider);
  const enabledFlags = ensureArray(req.body.gatewayEnabled);
  const publicKeys = ensureArray(req.body.gatewayPublicKey);
  const secretKeys = ensureArray(req.body.gatewaySecretKey);
  const instructions = ensureArray(req.body.gatewayInstructions);
  const paymentGateways = providers.map((provider: string, index: number) => ({
    provider,
    enabled:
      enabledFlags.includes(String(index)) ||
      req.body[`gatewayEnabled_${index}`] === 'on' ||
      req.body[`gatewayEnabled_${index}`] === 'true',
    publicKey: publicKeys[index] || undefined,
    secretKey: secretKeys[index] || undefined,
    metadata: {
      instructions: instructions[index] || ''
    }
  }));

  store.updateSettings({
    headerHtml: req.body.headerHtml,
    footerHtml: req.body.footerHtml,
    paymentGateways
  });

  res.redirect('/admin');
});

app.use((_req, res) => {
  res.status(404).render('errors/404.njk');
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Ecommerce starter listening on http://localhost:${port}`);
});
