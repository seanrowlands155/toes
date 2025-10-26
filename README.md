# Nunjucks Ecommerce Starter

A TypeScript Node.js ecommerce starter project using Express and Nunjucks. It provides a minimal management dashboard and storefront pages for managing inventory, categories, custom pages, and payment gateway settings.

## Features

- Product inventory management with images, pricing, and additional info fields.
- Customisable product templates using Nunjucks and configurable per product.
- Category creation, editing, and hierarchy support.
- WYSIWYG editor for custom pages and site header/footer content.
- Payment gateway configuration area for managing online payment settings.
- Responsive storefront with header and footer sourced from editable site settings.

## Getting started

```bash
npm install
npm run dev
```

The development server runs on [http://localhost:3000](http://localhost:3000) with hot-reloading via `tsx`.

To build the project for production:

```bash
npm run build
npm start
```

During runtime the server reads templates and public assets from the `src` directory when not present in the compiled output, simplifying development workflows.

## Project structure

```
src/
├── data/          # In-memory store and data models
├── public/        # Static assets (WYSIWYG helper)
├── routes/        # Route helpers (reserved for expansion)
├── views/         # Nunjucks templates
└── server.ts      # Express server entry point
```

The in-memory data store is designed for demonstration purposes. For production usage, replace it with a database-backed implementation and integrate real payment gateway SDKs.
