import type { Product, ProductSize } from '@/types';

export const ALL_SIZES: ProductSize[] = ['XS', 'S', 'M', 'L', 'XL', 'Free Size'];

export const COLOR_SWATCHES: Record<string, string> = {
  Black: '#1a1a1a',
  White: '#ffffff',
  Beige: '#E8D5C4',
  Ivory: '#FFF8F3',
  Rose: '#C85B7C',
  Coral: '#F08F86',
  Peach: '#F4C5AA',
  Lavender: '#C9B8DD',
  Plum: '#493343',
  Navy: '#2B3A5E',
  Olive: '#6B6B3A',
  Mustard: '#D9A96C',
  Burgundy: '#6D2C3E',
  Sage: '#A8B5A0',
  Dusty: '#C9B8A0',
  Charcoal: '#3A3A3A',
};

export function getColorSwatch(color: string): string {
  return COLOR_SWATCHES[color] || '#C9B8DD';
}

export function getPrimaryImage(product: Pick<Product, 'image_urls'>): string | null {
  if (!product.image_urls || product.image_urls.length === 0) return null;
  return product.image_urls[0];
}
