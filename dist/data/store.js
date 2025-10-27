"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = void 0;
const crypto_1 = require("crypto");
const slugify = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
class DataStore {
    constructor() {
        this.products = new Map();
        this.categories = new Map();
        this.pages = new Map();
        this.settings = {
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
    }
    createCategory(name, description, parentId) {
        const id = (0, crypto_1.randomUUID)();
        const category = {
            id,
            name,
            description,
            parentId,
            slug: slugify(name)
        };
        this.categories.set(id, category);
        return category;
    }
    listCategories() {
        return Array.from(this.categories.values());
    }
    getCategory(id) {
        return this.categories.get(id);
    }
    updateCategory(id, update) {
        const category = this.categories.get(id);
        if (!category)
            return undefined;
        const updated = { ...category, ...update };
        if (update.name) {
            updated.slug = slugify(update.name);
        }
        this.categories.set(id, updated);
        return updated;
    }
    removeCategory(id) {
        this.categories.delete(id);
        this.products.forEach((product) => {
            product.categoryIds = product.categoryIds.filter((categoryId) => categoryId !== id);
            this.products.set(product.id, product);
        });
    }
    createProduct(productInput) {
        const id = (0, crypto_1.randomUUID)();
        const slug = productInput.slug ? slugify(productInput.slug) : slugify(productInput.name);
        const product = {
            ...productInput,
            id,
            slug
        };
        this.products.set(id, product);
        return product;
    }
    listProducts() {
        return Array.from(this.products.values());
    }
    getProduct(id) {
        return this.products.get(id);
    }
    updateProduct(id, update) {
        const product = this.products.get(id);
        if (!product)
            return undefined;
        const updated = { ...product, ...update };
        if (update.name && !update.slug) {
            updated.slug = slugify(update.name);
        }
        if (update.slug) {
            updated.slug = slugify(update.slug);
        }
        this.products.set(id, updated);
        return updated;
    }
    removeProduct(id) {
        this.products.delete(id);
    }
    createPage(pageInput) {
        const id = (0, crypto_1.randomUUID)();
        const slug = pageInput.slug ? slugify(pageInput.slug) : slugify(pageInput.title);
        const page = {
            ...pageInput,
            id,
            slug
        };
        this.pages.set(id, page);
        return page;
    }
    listPages() {
        return Array.from(this.pages.values());
    }
    getPageBySlug(slug) {
        return Array.from(this.pages.values()).find((page) => page.slug === slug);
    }
    updatePage(id, update) {
        const page = this.pages.get(id);
        if (!page)
            return undefined;
        const updated = { ...page, ...update };
        if (update.title && !update.slug) {
            updated.slug = slugify(update.title);
        }
        if (update.slug) {
            updated.slug = slugify(update.slug);
        }
        this.pages.set(id, updated);
        return updated;
    }
    removePage(id) {
        this.pages.delete(id);
    }
    getSettings() {
        return this.settings;
    }
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        return this.settings;
    }
}
exports.store = new DataStore();
