-- ============================================================================
-- Store + catalog seed. Safe for any environment (no users, no passwords).
-- Runs on `supabase db reset` (with 02_dev_users.sql) and `supabase db push --include-seed`.
-- ============================================================================
set client_min_messages to warning;

-- ---------- store ----------
insert into public.stores (id, slug, name, tagline, logo_url, favicon_url, currency, default_locale, enabled_locales, contact_email,
                           contact_phone, email_from, tax_rate_bp, low_stock_threshold, created_by, settings, theme)
values ('10000000-0000-0000-0000-000000000001', 'default', 'Petitati', 'Everything your pet loves',
        '/brand/petitati-logo.svg', '/brand/petitati-mark-square.svg',  -- the client's paw mark, shipped in public/brand
        'TRY', 'en', '{en,tr,fa}', 'hello@petitati.local', '+90 212 555 00 00', 'Petitati <noreply@petitati.local>', 2000, 5,
        null,  -- created_by; the dev-users seed links the demo owner locally
        -- Home hero (Design page → Hero). The seed photo is a placeholder; a real store uploads to store-media/<id>/hero/.
        '{
          "hero_title": {"en": "Everything your pet loves", "tr": "Evcil dostunuzun sevdiği her şey", "fa": "هر چیزی که حیوان خانگی شما دوست دارد"},
          "hero_subtitle": {"en": "Toys, food, beds and accessories, delivered to your door.", "tr": "Oyuncak, mama, yatak ve aksesuarlar kapınıza gelsin.", "fa": "اسباب‌بازی، غذا، تخت و لوازم جانبی، تحویل درب منزل."},
          "hero_image": "https://picsum.photos/seed/petitati-hero/2400/1000",
          "hero_slides": [
            {
              "image": "https://picsum.photos/seed/petitati-hero/2400/1000",
              "title": {"en": "Everything your pet loves", "tr": "Evcil dostunuzun sevdiği her şey", "fa": "هر چیزی که حیوان خانگی شما دوست دارد"},
              "subtitle": {"en": "Toys, food, beds and accessories, delivered to your door.", "tr": "Oyuncak, mama, yatak ve aksesuarlar kapınıza gelsin.", "fa": "اسباب‌بازی، غذا، تخت و لوازم جانبی، تحویل درب منزل."},
              "link": null
            },
            {
              "image": "https://picsum.photos/seed/petitati-hero-2/2400/1000",
              "title": {"en": "New arrivals every week", "tr": "Her hafta yeni ürünler", "fa": "هر هفته محصولات تازه"},
              "subtitle": {"en": "Fresh toys, treats and gear for cats and dogs.", "tr": "Kediler ve köpekler için yeni oyuncaklar, ödüller ve ekipman.", "fa": "اسباب‌بازی، تشویقی و لوازم تازه برای گربه‌ها و سگ‌ها."},
              "link": "/shop?sort=newest"
            }
          ],
          "address": {"en": "Bağdat Cd. No:123\nKadıköy, İstanbul", "tr": "Bağdat Cd. No:123\nKadıköy, İstanbul", "fa": "خیابان بغداد، پلاک ۱۲۳\nکادیکوی، استانبول"},
          "opening_hours": {"en": "Mon–Sat 9:00–19:00\nSun closed", "tr": "Pzt–Cmt 9:00–19:00\nPazar kapalı", "fa": "دوشنبه تا شنبه ۹:۰۰ تا ۱۹:۰۰\nیکشنبه تعطیل"},
          "social_links": {"instagram": "https://instagram.com/petitati", "whatsapp": "https://wa.me/902125550000"},
          "trust_enabled": true,
          "trust_items": [],
          "payment_methods": ["visa", "mastercard", "troy", "cash_on_delivery"]
        }'::jsonb,
        '{
          "sections": {
            "announcementBar": "minimal", "navbar": "minimal", "hero": "minimal", "categoryBanner": "minimal",
            "productGrid": "minimal", "productCard": "minimal", "productPage": "minimal",
            "cartDrawer": "minimal", "checkout": "minimal", "reviews": "minimal",
            "newsletter": "minimal", "footer": "minimal"
          },
          "colors": {
            "primary": "#157fa1", "primaryForeground": "#ffffff",
            "accent": "#f7a83b", "accentForeground": "#1c1917",
            "background": "#faf3fc", "card": "#ffffff", "foreground": "#17323d",
            "muted": "#f0e2f5", "mutedForeground": "#4a5f68"
          },
          "fonts": { "heading": "Inter", "body": "Inter" },
          "radius": "0.75rem"
        }'::jsonb);

-- ---------- shipping & coupons ----------
insert into public.shipping_rates (store_id, name, rate, free_over, cost, min_days, max_days, sort_order) values
  ('10000000-0000-0000-0000-000000000001', '{"en":"Standard delivery","tr":"Standart teslimat","fa":"ارسال عادی"}', 4990, 50000, 3500, 2, 5, 0),
  ('10000000-0000-0000-0000-000000000001', '{"en":"Express delivery","tr":"Hızlı teslimat","fa":"ارسال سریع"}', 9990, null, 7000, 1, 2, 1);

insert into public.coupons (store_id, code, type, value, min_subtotal, max_uses) values
  ('10000000-0000-0000-0000-000000000001', 'WELCOME10', 'percent', 10, 20000, null),
  ('10000000-0000-0000-0000-000000000001', 'FREESHIP', 'free_shipping', 0, null, 100),
  ('10000000-0000-0000-0000-000000000001', 'PET50', 'fixed', 5000, 30000, 50);

insert into public.expense_categories (store_id, name, sort_order) values
  ('10000000-0000-0000-0000-000000000001', 'Stock purchase', 0),
  ('10000000-0000-0000-0000-000000000001', 'Marketing', 1),
  ('10000000-0000-0000-0000-000000000001', 'Shipping supplies', 2),
  ('10000000-0000-0000-0000-000000000001', 'Rent & utilities', 3),
  ('10000000-0000-0000-0000-000000000001', 'Other', 4);

-- ---------- catalog ----------
do $$
declare
  v_store uuid := '10000000-0000-0000-0000-000000000001';
  v_cat record;
  v_prod record;
  v_pid uuid;
  v_opt_id uuid;
  v_val_ids uuid[];
  v_val_id uuid;
  v_var_id uuid;
  v_size text;
  v_sizes text[] := array['S','M','L'];
  v_size_names jsonb := '{"S":{"en":"Small","tr":"Küçük","fa":"کوچک"},"M":{"en":"Medium","tr":"Orta","fa":"متوسط"},"L":{"en":"Large","tr":"Büyük","fa":"بزرگ"}}';
  v_i int;
  v_n int := 0;
  v_brand record;
  v_parent uuid;
begin
  -- brands (client: a second taxonomy by manufacturer)
  for v_brand in select * from (values
    ('royal-canin', 'Royal Canin', 0),
    ('gourmet',     'Gourmet',     1),
    ('whiskas',     'Whiskas',     2),
    ('pedigree',    'Pedigree',    3),
    ('cesar',       'Cesar',       4),
    ('kong',        'KONG',        5),
    ('trixie',      'Trixie',      6),
    ('ferplast',    'Ferplast',    7)
  ) as b(slug, name, ord) loop
    insert into public.brands (store_id, slug, name, sort_order) values (v_store, v_brand.slug, v_brand.name, v_brand.ord);
  end loop;

  -- categories
  for v_cat in select * from (values
    ('cat-food',    null,       'Cat food',        'Kedi maması',        'غذای گربه',       0),
    ('cat-dry',     'cat-food', 'Dry food',        'Kuru mama',          'غذای خشک',        0),
    ('cat-wet',     'cat-food', 'Wet food',        'Yaş mama',           'غذای تر',         1),
    ('cat-treats',  'cat-food', 'Treats',          'Ödüller',            'تشویقی',          2),
    ('dog-food',    null,       'Dog food',        'Köpek maması',       'غذای سگ',         1),
    ('dog-dry',     'dog-food', 'Dry food',        'Kuru mama',          'غذای خشک',        0),
    ('dog-wet',     'dog-food', 'Wet food',        'Yaş mama',           'غذای تر',         1),
    ('dog-treats',  'dog-food', 'Treats',          'Ödüller',            'تشویقی',          2),
    ('toys',        null,       'Toys',            'Oyuncaklar',         'اسباب‌بازی‌ها',    2),
    ('beds',        null,       'Beds',            'Yataklar',           'جای خواب',        3),
    ('collars',     null,       'Collars & Leashes','Tasma ve Kayışlar', 'قلاده و بند',     4),
    ('grooming',    null,       'Grooming',        'Bakım',              'نظافت و بهداشت',  5)
  ) as c(slug, parent, en, tr, fa, ord) loop
    v_parent := null;
    if v_cat.parent is not null then
      select id into v_parent from public.categories where store_id = v_store and slug = v_cat.parent;
    end if;
    insert into public.categories (id, store_id, parent_id, slug, sort_order, image_url)
    values (gen_random_uuid(), v_store, v_parent, v_cat.slug, v_cat.ord, 'https://picsum.photos/seed/' || v_cat.slug || '/800/600')
    returning id into v_pid;
    insert into public.category_translations (category_id, locale, name) values
      (v_pid, 'en', v_cat.en), (v_pid, 'tr', v_cat.tr), (v_pid, 'fa', v_cat.fa);
  end loop;

  -- products: (category slug, brand slug, product slug, en, tr, fa, base price minor units, cost, has sizes, featured)
  for v_prod in select * from (values
    ('cat-dry',   'royal-canin', 'royal-canin-kitten',      'Royal Canin Kitten',        'Royal Canin Kitten',           'رویال کنین کیتن',            89900, 62000, true,  true),
    ('cat-dry',   'whiskas',     'chicken-cat-kibble',      'Chicken Cat Kibble',        'Tavuklu Kedi Maması',          'غذای خشک گربه با مرغ',       39900, 24000, true,  false),
    ('cat-wet',   'gourmet',     'gourmet-gold-pate',       'Gourmet Gold Pâté',         'Gourmet Gold Pate',            'پته گورمت گلد',              4900,  2900, false, true),
    ('cat-wet',   'whiskas',     'whiskas-pouch-tuna',      'Whiskas Tuna Pouch',        'Whiskas Ton Balıklı Pouch',    'پوچ ویسکاس با تن',           3900,  2200, false, false),
    ('cat-treats','gourmet',     'freeze-dried-liver',      'Freeze-dried Liver',        'Kurutulmuş Ciğer',             'جگر خشک‌شده',                16900,  7000, false, false),
    ('dog-dry',   'royal-canin', 'royal-canin-medium-adult','Royal Canin Medium Adult',  'Royal Canin Medium Adult',     'رویال کنین مدیوم ادالت',     129900, 88000, true,  true),
    ('dog-dry',   'pedigree',    'salmon-dog-kibble',       'Salmon Dog Kibble',         'Somonlu Köpek Maması',         'غذای خشک سگ با سالمون',      45900, 28000, true,  true),
    ('dog-wet',   'cesar',       'cesar-beef-tray',         'Cesar Beef Tray',           'Cesar Sığır Etli',             'سزار با گوشت گاو',            5900,  3400, false, false),
    ('dog-treats','pedigree',    'dental-chews',            'Dental Chews',              'Diş Çubukları',                'تشویقی دندانی',              12900,  5000, false, false),
    ('toys',      'kong',        'rope-tug-toy',            'Rope Tug Toy',              'Halat Çekiştirme Oyuncağı',    'اسباب‌بازی طنابی',           14900,  6000, false, true),
    ('toys',      'kong',        'squeaky-duck',            'Squeaky Duck',              'Öten Ördek',                   'اردک صدادار',                9900,   3500, false, false),
    ('toys',      'trixie',      'feather-wand',            'Feather Wand',              'Tüylü Kedi Çubuğu',            'چوب پر گربه',                7900,   2500, false, true),
    ('toys',      'kong',        'treat-puzzle-ball',       'Treat Puzzle Ball',         'Ödül Bulmaca Topu',            'توپ معمایی تشویقی',          19900,  8000, false, false),
    ('beds',      'ferplast',    'orthopedic-dog-bed',      'Orthopedic Dog Bed',        'Ortopedik Köpek Yatağı',       'تخت ارتوپدیک سگ',            89900, 42000, true,  true),
    ('beds',      'trixie',      'donut-cat-bed',           'Donut Cat Bed',             'Donut Kedi Yatağı',            'جای خواب دونات گربه',        49900, 21000, true,  false),
    ('beds',      'trixie',      'cooling-mat',             'Cooling Mat',               'Soğutucu Mat',                 'زیرانداز خنک‌کننده',         34900, 15000, true,  false),
    ('collars',   'trixie',      'reflective-collar',       'Reflective Collar',         'Reflektörlü Tasma',            'قلاده شب‌رنگ',               17900,  6500, true,  true),
    ('collars',   'ferplast',    'padded-harness',          'Padded Harness',            'Yastıklı Göğüs Tasması',       'قلاده کتفی نرم',             29900, 12000, true,  false),
    ('collars',   'ferplast',    'retractable-leash',       'Retractable Leash',         'Otomatik Kayış',               'بند خودجمع‌شونده',           24900, 10000, false, false),
    ('collars',   'trixie',      'cat-breakaway-collar',    'Cat Breakaway Collar',      'Kedi Güvenlik Tasması',        'قلاده ایمن گربه',             8900,  3000, false, false),
    ('grooming',  'trixie',      'slicker-brush',           'Slicker Brush',             'Tüy Fırçası',                  'برس مو',                     12900,  4500, false, false),
    ('grooming',  'trixie',      'nail-clippers',           'Nail Clippers',             'Tırnak Makası',                'ناخن‌گیر',                   10900,  3500, false, false),
    ('grooming',  null,          'oatmeal-shampoo',         'Oatmeal Shampoo',           'Yulaflı Şampuan',              'شامپو جو دوسر',              13900,  5000, false, true),
    ('grooming',  'ferplast',    'deshedding-tool',         'Deshedding Tool',           'Tüy Alma Aleti',               'ابزار ضد ریزش مو',           22900,  9000, false, false),
    ('grooming',  null,          'paw-balm',                'Paw Balm',                  'Pati Balsamı',                 'بالم پنجه',                   8900,  3000, false, false)
  ) as p(cat, brand, slug, en, tr, fa, price, cost, sized, featured) loop
    v_n := v_n + 1;
    insert into public.products (id, store_id, slug, status, is_featured, is_bestseller, tags, brand_id)
    values (gen_random_uuid(), v_store, v_prod.slug, 'active', v_prod.featured,
            v_prod.slug in ('rope-tug-toy', 'royal-canin-kitten', 'orthopedic-dog-bed', 'feather-wand'),
            case when v_n % 3 = 0 then array['new'] else '{}'::text[] end,
            (select id from public.brands where store_id = v_store and slug = v_prod.brand))
    returning id into v_pid;

    insert into public.product_translations (product_id, locale, name, short_description, description) values
      (v_pid, 'en', v_prod.en, 'Quality ' || lower(v_prod.en) || ' your pet will love.',
        'Made from durable, pet-safe materials. ' || v_prod.en || ' is designed for everyday use and easy cleaning.'),
      (v_pid, 'tr', v_prod.tr, 'Evcil dostunuzun bayılacağı kaliteli ' || lower(v_prod.tr) || '.',
        'Dayanıklı ve evcil hayvan dostu malzemelerden üretilmiştir. Günlük kullanım için tasarlandı, kolay temizlenir.'),
      (v_pid, 'fa', v_prod.fa, v_prod.fa || ' با کیفیت که حیوان خانگی شما عاشقش می‌شود.',
        'ساخته‌شده از مواد بادوام و ایمن برای حیوانات خانگی. مناسب استفاده روزمره و تمیز کردن آسان.');

    insert into public.product_categories (product_id, category_id)
    select v_pid, c.id from public.categories c where c.store_id = v_store and c.slug = v_prod.cat;

    for v_i in 1..3 loop
      insert into public.product_images (product_id, url, alt, sort_order)
      values (v_pid, 'https://picsum.photos/seed/' || v_prod.slug || '-' || v_i || '/900/900',
              jsonb_build_object('en', v_prod.en, 'tr', v_prod.tr, 'fa', v_prod.fa), v_i - 1);
    end loop;

    if v_prod.sized then
      insert into public.product_options (id, product_id, name, sort_order)
      values (gen_random_uuid(), v_pid, '{"en":"Size","tr":"Beden","fa":"سایز"}', 0)
      returning id into v_opt_id;
      v_i := 0;
      foreach v_size in array v_sizes loop
        insert into public.product_option_values (id, option_id, value, sort_order)
        values (gen_random_uuid(), v_opt_id, v_size_names -> v_size, v_i)
        returning id into v_val_id;
        insert into public.product_variants (id, store_id, product_id, sku, price, compare_at_price, cost_price, is_default, weight_grams)
        values (gen_random_uuid(), v_store, v_pid, upper(replace(v_prod.slug, '-', '')) || '-' || v_size,
                v_prod.price + v_i * 5000,
                case when v_prod.featured then v_prod.price + v_i * 5000 + 8000 end,
                v_prod.cost + v_i * 2000, v_i = 0, 300 + v_i * 200)
        returning id into v_var_id;
        insert into public.variant_option_values (variant_id, option_value_id) values (v_var_id, v_val_id);
        insert into public.stock_movements (store_id, variant_id, delta, reason, actor_id, note)
        values (v_store, v_var_id, 8 + (v_i * 7), 'initial', null, 'Seed stock');
        v_i := v_i + 1;
      end loop;
    else
      insert into public.product_variants (id, store_id, product_id, sku, price, compare_at_price, cost_price, is_default, weight_grams)
      values (gen_random_uuid(), v_store, v_pid, upper(replace(v_prod.slug, '-', '')),
              v_prod.price, case when v_prod.featured then v_prod.price + 5000 end, v_prod.cost, true, 250)
      returning id into v_var_id;
      insert into public.stock_movements (store_id, variant_id, delta, reason, actor_id, note)
      values (v_store, v_var_id, case when v_n % 5 = 0 then 3 else 25 end, 'initial',
              null, 'Seed stock');
    end if;
  end loop;
end $$;
