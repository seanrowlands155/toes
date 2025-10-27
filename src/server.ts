import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import nunjucks from 'nunjucks';
import { existsSync } from 'fs';
import { store } from './data/store';
import { Product } from './data/models';

const app = express();

type CartItem = {
  productId: string;
  quantity: number;
};

type RequestWithCart = Request & { __cartItems?: CartItem[] };

const CART_COOKIE_NAME = 'cart';

const getCookieValue = (req: Request, name: string): string | undefined => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!match) return undefined;
  try {
    return decodeURIComponent(match.slice(name.length + 1));
  } catch {
    return undefined;
  }
};

const parseCartItems = (req: RequestWithCart): CartItem[] => {
  if (req.__cartItems) return req.__cartItems;
  const raw = getCookieValue(req, CART_COOKIE_NAME);
  if (!raw) {
    req.__cartItems = [];
    return req.__cartItems;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      req.__cartItems = [];
      return req.__cartItems;
    }

    req.__cartItems = parsed
      .map((item) => ({
        productId: typeof item.productId === 'string' ? item.productId : '',
        quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0
      }))
      .filter((item) => item.productId && item.quantity > 0);
    return req.__cartItems;
  } catch {
    req.__cartItems = [];
    return req.__cartItems;
  }
};

const writeCartItems = (res: Response, items: CartItem[]) => {
  const sanitized = items.filter((item) => item.quantity > 0);
  res.cookie(CART_COOKIE_NAME, JSON.stringify(sanitized), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 30
  });
};

// after creating `app`
const isDev = process.env.NODE_ENV !== 'production';
if (isDev) {
  app.set('view cache', false);
}

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

app.use((req, res, next) => {
  const cartItems = parseCartItems(req as RequestWithCart);
  res.locals.cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  res.locals.query = req.query;
  next();
});

nunjucks.configure(viewsDir, {
  autoescape: true,
  express: app,
  noCache: isDev, // re-read templates on each render in dev
  watch: isDev    // watch template files for changes in dev
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
  res.render(template, {
    product,
    settings: store.getSettings(),
    categories: store.listCategories(),
    returnUrl: req.originalUrl
  });
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

app.get('/cart', (req, res) => {
  const cartItems = parseCartItems(req as RequestWithCart);
  const items = cartItems
    .map((item) => {
      const product = store.getProduct(item.productId);
      if (!product) return undefined;
      const lineTotal = product.price * item.quantity;
      return {
        product,
        quantity: item.quantity,
        lineTotal
      };
    })
    .filter((entry): entry is { product: Product; quantity: number; lineTotal: number } => Boolean(entry));

  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);

  res.render('cart/detail.njk', {
    items,
    total,
    settings: store.getSettings()
  });
});

app.post('/cart/add', (req, res) => {
  const request = req as RequestWithCart;
  const items = [...parseCartItems(request)];
  const productIdRaw = Array.isArray(req.body.productId) ? req.body.productId[0] : req.body.productId;
  const quantityRaw = Array.isArray(req.body.quantity) ? req.body.quantity[0] : req.body.quantity;
  const redirectRaw = Array.isArray(req.body.redirect) ? req.body.redirect[0] : req.body.redirect;

  if (typeof productIdRaw !== 'string') {
    return res.redirect(redirectRaw || '/');
  }

  const product = store.getProduct(productIdRaw);
  if (!product) {
    return res.redirect(redirectRaw || '/');
  }

  const quantity = Math.max(1, Number.parseInt(quantityRaw ?? '1', 10) || 1);

  const existingItem = items.find((item) => item.productId === product.id);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    items.push({ productId: product.id, quantity });
  }

  request.__cartItems = items;
  writeCartItems(res, items);

  const redirectUrl = redirectRaw && typeof redirectRaw === 'string' ? redirectRaw : `/products/${product.slug}`;
  const url = new URL(redirectUrl, `${req.protocol}://${req.get('host')}`);
  url.searchParams.set('added', '1');

  res.redirect(url.pathname + url.search);
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