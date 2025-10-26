import { randomUUID } from 'crypto';
import { Category, CustomPage, Product, SiteSettings } from './models';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

class DataStore {
  private products: Map<string, Product> = new Map();
  private categories: Map<string, Category> = new Map();
  private pages: Map<string, CustomPage> = new Map();
  private settings: SiteSettings = {
    headerHtml: '<h1 class="site-title">My Storefront</h1>',
    footerHtml: '<p>© ' + new Date().getFullYear() + ' My Storefront</p>',
    paymentGateways: [
      {
        provider: 'stripe',
        enabled: false,
        metadata: {
          instructions: 'Configure Stripe keys in the payment settings.'
        }
      }
    ]
  };

  createCategory(name: string, description?: string, parentId?: string): Category {
    const id = randomUUID();
    const category: Category = {
      id,
      name,
      description,
      parentId,
      slug: slugify(name)
    };
    this.categories.set(id, category);
    return category;
  }

  listCategories(): Category[] {
    return Array.from(this.categories.values());
  }

  getCategory(id: string): Category | undefined {
    return this.categories.get(id);
  }

  updateCategory(id: string, update: Partial<Omit<Category, 'id'>>): Category | undefined {
    const category = this.categories.get(id);
    if (!category) return undefined;
    const updated: Category = { ...category, ...update };
    if (update.name) {
      updated.slug = slugify(update.name);
    }
    this.categories.set(id, updated);
    return updated;
  }

  removeCategory(id: string) {
    this.categories.delete(id);
    this.products.forEach((product) => {
      product.categoryIds = product.categoryIds.filter((categoryId) => categoryId !== id);
      this.products.set(product.id, product);
    });
  }

  createProduct(productInput: Omit<Product, 'id' | 'slug'> & { slug?: string }): Product {
    const id = randomUUID();
    const slug = productInput.slug ? slugify(productInput.slug) : slugify(productInput.name);
    const product: Product = {
      ...productInput,
      id,
      slug
    };
    this.products.set(id, product);
    return product;
  }

  listProducts(): Product[] {
    return Array.from(this.products.values());
  }

  getProduct(id: string): Product | undefined {
    return this.products.get(id);
  }

  updateProduct(id: string, update: Partial<Omit<Product, 'id'>>): Product | undefined {
    const product = this.products.get(id);
    if (!product) return undefined;
    const updated: Product = { ...product, ...update };
    if (update.name && !update.slug) {
      updated.slug = slugify(update.name);
    }
    if (update.slug) {
      updated.slug = slugify(update.slug);
    }
    this.products.set(id, updated);
    return updated;
  }

  removeProduct(id: string) {
    this.products.delete(id);
  }

  createPage(pageInput: Omit<CustomPage, 'id' | 'slug'> & { slug?: string }): CustomPage {
    const id = randomUUID();
    const slug = pageInput.slug ? slugify(pageInput.slug) : slugify(pageInput.title);
    const page: CustomPage = {
      ...pageInput,
      id,
      slug
    };
    this.pages.set(id, page);
    return page;
  }

  listPages(): CustomPage[] {
    return Array.from(this.pages.values());
  }

  getPageBySlug(slug: string): CustomPage | undefined {
    return Array.from(this.pages.values()).find((page) => page.slug === slug);
  }

  updatePage(id: string, update: Partial<Omit<CustomPage, 'id'>>): CustomPage | undefined {
    const page = this.pages.get(id);
    if (!page) return undefined;
    const updated: CustomPage = { ...page, ...update };
    if (update.title && !update.slug) {
      updated.slug = slugify(update.title);
    }
    if (update.slug) {
      updated.slug = slugify(update.slug);
    }
    this.pages.set(id, updated);
    return updated;
  }

  removePage(id: string) {
    this.pages.delete(id);
  }

  getSettings(): SiteSettings {
    return this.settings;
  }

  updateSettings(settings: Partial<SiteSettings>): SiteSettings {
    this.settings = { ...this.settings, ...settings };
    return this.settings;
  }
}

export const store = new DataStore();
