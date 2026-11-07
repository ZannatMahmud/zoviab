/*
# ZOVIA — Seed categories and sample products

## Plain-English summary
This migration populates the database with 8 fashion categories and 12 sample
products so the store looks like a real boutique from first launch. All products
use real fashion photography from Pexels (license-free). Prices are in BDT.

## Categories seeded
1. Long Dresses
2. Midi Dresses
3. Tunics & Blouses
4. Two-Piece Sets
5. Wide-Leg Trousers
6. Handbags
7. Shoes
8. Scarves & Accessories

## Products seeded
12 products spread across categories, with prices in BDT, stock, sizes, colors,
and image URLs. Some are marked featured for the home page.

## Important Notes
1. Uses fixed UUIDs for categories so product references are stable.
2. Re-running is safe (IF NOT EXISTS / ON CONFLICT).
3. No user accounts or passwords are seeded here.
*/

-- Categories with fixed UUIDs for stable product references
INSERT INTO public.categories (id, name, description, image_url) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Long Dresses', 'Elegant flowing long dresses for graceful occasions.', 'https://images.pexels.com/photos/27133206/pexels-photo-27133206.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('11111111-1111-1111-1111-111111111102', 'Midi Dresses', 'Sophisticated midi-length dresses that blend comfort and style.', 'https://images.pexels.com/photos/17901631/pexels-photo-17901631.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('11111111-1111-1111-1111-111111111103', 'Tunics & Blouses', 'Tasteful blouses and long tunics for everyday elegance.', 'https://images.pexels.com/photos/10686399/pexels-photo-10686399.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('11111111-1111-1111-1111-111111111104', 'Two-Piece Sets', 'Coordinated two-piece outfits that make styling effortless.', 'https://images.pexels.com/photos/28168157/pexels-photo-28168157.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('11111111-1111-1111-1111-111111111105', 'Wide-Leg Trousers', 'Contemporary wide-leg trousers for a polished silhouette.', 'https://images.pexels.com/photos/31400265/pexels-photo-31400265.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('11111111-1111-1111-1111-111111111106', 'Handbags', 'Curated handbags to complete your look.', 'https://images.pexels.com/photos/27954772/pexels-photo-27954772.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('11111111-1111-1111-1111-111111111107', 'Shoes', 'Elegant footwear from heels to flats.', 'https://images.pexels.com/photos/17826424/pexels-photo-17826424.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('11111111-1111-1111-1111-111111111108', 'Scarves & Accessories', 'Silk scarves and finishing touches for every outfit.', 'https://images.pexels.com/photos/29057421/pexels-photo-29057421.jpeg?auto=compress&cs=tinysrgb&h=650&w=940')
ON CONFLICT (name) DO NOTHING;

-- Products
INSERT INTO public.products (name, description, price, stock, sizes, colors, image_urls, category_id, featured) VALUES
  (
    'Rose Bloom Long Dress',
    'A flowing rose-pink long dress with delicate pleating and a flattering waist tie. Perfect for festive gatherings and elegant evenings. Crafted from breathable fabric that drapes beautifully.',
    2890, 15,
    ARRAY['S','M','L','XL'],
    ARRAY['Rose','Beige'],
    ARRAY['https://images.pexels.com/photos/27133206/pexels-photo-27133206.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'],
    '11111111-1111-1111-1111-111111111101',
    true
  ),
  (
    'Ivory Elegance Gown',
    'A timeless ivory long dress with a classic silhouette. The soft fabric and graceful cut make it a wardrobe essential for special occasions.',
    3290, 8,
    ARRAY['XS','S','M','L'],
    ARRAY['Ivory','White'],
    ARRAY['https://images.pexels.com/photos/27560852/pexels-photo-27560852.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'],
    '11111111-1111-1111-1111-111111111101',
    true
  ),
  (
    'Sapphire Midi Dress',
    'A vibrant blue midi dress that turns heads. Featuring a fitted bodice and flowing skirt, it pairs beautifully with heels for a polished look.',
    2190, 12,
    ARRAY['S','M','L'],
    ARRAY['Navy'],
    ARRAY['https://images.pexels.com/photos/8450071/pexels-photo-8450071.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'],
    '11111111-1111-1111-1111-111111111102',
    true
  ),
  (
    'Garden Stroll Midi',
    'A charming patterned midi dress perfect for daytime outings. The lightweight fabric and flattering cut make it a versatile addition to your wardrobe.',
    1890, 20,
    ARRAY['XS','S','M','L','XL'],
    ARRAY['Beige','Sage'],
    ARRAY['https://images.pexels.com/photos/17901631/pexels-photo-17901631.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'],
    '11111111-1111-1111-1111-111111111102',
    false
  ),
  (
    'Classic White Blouse',
    'A crisp white blouse with a relaxed fit. Pairs effortlessly with trousers or skirts for both casual and formal looks. A timeless staple.',
    1490, 25,
    ARRAY['XS','S','M','L','XL'],
    ARRAY['White'],
    ARRAY['https://images.pexels.com/photos/10686399/pexels-photo-10686399.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'],
    '11111111-1111-1111-1111-111111111103',
    true
  ),
  (
    'Oversized Linen Tunic',
    'A comfortable oversized tunic in soft linen blend. Perfect for warm days, it pairs beautifully with leggings or wide-leg trousers for an effortless look.',
    1690, 18,
    ARRAY['S','M','L','XL','Free Size'],
    ARRAY['White','Beige'],
    ARRAY['https://images.pexels.com/photos/7945547/pexels-photo-7945547.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'],
    '11111111-1111-1111-1111-111111111103',
    false
  ),
  (
    'Sunshine Co-ord Set',
    'A stylish yellow two-piece set featuring a tailored top and matching bottoms. Coordinated sets make styling effortless for a put-together look.',
    2590, 10,
    ARRAY['S','M','L'],
    ARRAY['Mustard'],
    ARRAY['https://images.pexels.com/photos/28168157/pexels-photo-28168157.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'],
    '11111111-1111-1111-1111-111111111104',
    true
  ),
  (
    'Floral Two-Piece Set',
    'A romantic floral two-piece set with a fitted top and flowing bottoms. Perfect for garden parties and weekend brunches.',
    2390, 14,
    ARRAY['XS','S','M','L'],
    ARRAY['Rose','Sage'],
    ARRAY['https://images.pexels.com/photos/31566599/pexels-photo-31566599.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'],
    '11111111-1111-1111-1111-111111111104',
    false
  ),
  (
    'Beige Wide-Leg Trousers',
    'Sophisticated wide-leg trousers in a versatile beige shade. High-waisted with a flowing silhouette that elongates the legs. Pairs with any blouse.',
    1790, 22,
    ARRAY['XS','S','M','L','XL'],
    ARRAY['Beige','Charcoal'],
    ARRAY['https://images.pexels.com/photos/31400265/pexels-photo-31400265.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'],
    '11111111-1111-1111-1111-111111111105',
    false
  ),
  (
    'Pastel Tote Handbag',
    'A elegant pastel handbag that complements any outfit. Spacious enough for daily essentials with a refined finish.',
    1990, 16,
    NULL,
    ARRAY['Rose','Peach','Lavender'],
    ARRAY['https://images.pexels.com/photos/27954772/pexels-photo-27954772.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'],
    '11111111-1111-1111-1111-111111111106',
    true
  ),
  (
    'Classic Chain Heels',
    'Elegant heeled shoes with chain detail. A versatile pair that elevates both casual and formal outfits. Comfortable padding for all-day wear.',
    2290, 11,
    ARRAY['Free Size'],
    ARRAY['Black'],
    ARRAY['https://images.pexels.com/photos/17826424/pexels-photo-17826424.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'],
    '11111111-1111-1111-1111-111111111107',
    false
  ),
  (
    'Silk Headscarf Set',
    'A luxurious silk-blend headscarf that adds elegance to any look. Features a beautiful print and soft drape. One size fits all.',
    990, 30,
    ARRAY['Free Size'],
    ARRAY['Rose','Coral','Lavender'],
    ARRAY['https://images.pexels.com/photos/29057421/pexels-photo-29057421.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'],
    '11111111-1111-1111-1111-111111111108',
    false
  )
ON CONFLICT DO NOTHING;
