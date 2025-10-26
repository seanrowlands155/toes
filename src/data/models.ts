export type ProductMedia = {
  id: string;
  url: string;
  altText: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  media: ProductMedia[];
  additionalInfo: Record<string, string>;
  categoryIds: string[];
  customTemplate?: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
};

export type CustomPage = {
  id: string;
  title: string;
  slug: string;
  content: string;
  template: string;
};

export type PaymentGatewayConfig = {
  provider: string;
  enabled: boolean;
  publicKey?: string;
  secretKey?: string;
  metadata?: Record<string, string>;
};

export type SiteSettings = {
  headerHtml: string;
  footerHtml: string;
  paymentGateways: PaymentGatewayConfig[];
};
