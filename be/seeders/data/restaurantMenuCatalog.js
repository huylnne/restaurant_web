'use strict';

/** Ảnh Pexels — CDN ổn định, crop 800px */
function img(photoId) {
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=800`;
}

/**
 * Thực đơn mẫu ABC Restaurant — đa danh mục, mô tả đầy đủ.
 * @property {boolean} [featured] — món nổi bật / gợi ý
 * @property {boolean} [onSale] — có giá khuyến mãi (sale_price)
 * @property {number} [salePercent=0.85] — tỷ lệ giá sale so với giá gốc
 */
const RESTAURANT_MENU_CATALOG = [
  // —— Khai vị ——
  {
    name: 'Gỏi cuốn tôm thịt',
    description: 'Bánh tráng cuốn tôm sú, thịt luộc, bún và rau thơm — chấm tương đậu phộng.',
    price: 45000,
    category: 'Khai vị',
    featured: true,
    onSale: true,
    image_url: img(691114),
  },
  {
    name: 'Nem nướng Nha Trang',
    description: 'Nem nướng than hoa, ăn kèm bánh hỏi, rau sống và mắm nêm đậm đà.',
    price: 69000,
    category: 'Khai vị',
    featured: true,
    image_url: img(699953),
  },
  {
    name: 'Bánh tráng trộn',
    description: 'Bánh tráng sợi trộn tôm khô, rau răm, xoài xanh và sốt me cay nhẹ.',
    price: 39000,
    category: 'Khai vị',
    image_url: img(1435907),
  },
  {
    name: 'Chả giò hải sản',
    description: 'Chả giò giòn rụm nhân tôm mực, ăn kèm nước mắm chua ngọt.',
    price: 55000,
    category: 'Khai vị',
    onSale: true,
    image_url: img(1126728),
  },
  {
    name: 'Salad bò tái chanh',
    description: 'Thịt bò tái, rau xà lách, cà chua bi và sốt chanh leo.',
    price: 72000,
    category: 'Khai vị',
    image_url: img(1640774),
  },
  {
    name: 'Súp măng cua',
    description: 'Súp nóng măng tươi, cua đồng và trứng cút — vị thanh ngọt.',
    price: 48000,
    category: 'Khai vị',
    image_url: img(2474661),
  },
  {
    name: 'Nộm đu đủ tôm khô',
    description: 'Đu đủ xanh, tôm khô, đậu phộng rang và mắm ruốc Huế.',
    price: 42000,
    category: 'Khai vị',
    image_url: img(1640777),
  },
  {
    name: 'Bánh bao chiên nhân tôm',
    description: 'Bánh bao vàng ăn kèm tương ớt và dưa leo.',
    price: 36000,
    category: 'Khai vị',
    image_url: img(3023476),
  },

  // —— Món chính ——
  {
    name: 'Phở bò tái chín',
    description: 'Phở bò Hà Nội nước dùng ninh xương 12 giờ, thịt tái và bò viên.',
    price: 75000,
    category: 'Món chính',
    featured: true,
    onSale: true,
    image_url: img(357756),
  },
  {
    name: 'Bún chả Hà Nội',
    description: 'Chả nướng than, bún tươi, rau thơm và nước mắm pha chua ngọt.',
    price: 68000,
    category: 'Món chính',
    featured: true,
    image_url: img(1437262),
  },
  {
    name: 'Cơm tấm sườn bì chả',
    description: 'Sườn nướng, bì, chả trứng, đồ chua và nước mắm ớt.',
    price: 65000,
    category: 'Món chính',
    featured: true,
    image_url: img(958545),
  },
  {
    name: 'Bún bò Huế',
    description: 'Bún bò cay nồng, giò heo, chả cua và rau chuối.',
    price: 72000,
    category: 'Món chính',
    featured: true,
    image_url: img(2291360),
  },
  {
    name: 'Cơm gà xối mỡ',
    description: 'Đùi gà chiên giòn rưới mỡ hành, cơm trắng và canh rau.',
    price: 58000,
    category: 'Món chính',
    onSale: true,
    image_url: img(70497),
  },
  {
    name: 'Bánh xèo tôm thịt',
    description: 'Bánh xèo vàng giòn nhân tôm thịt, ăn kèm rau sống và mắm nêm.',
    price: 79000,
    category: 'Món chính',
    featured: true,
    image_url: img(1438672),
  },
  {
    name: 'Lẩu Thái hải sản',
    description: 'Lẩu chua cay Tom Yum, tôm, mực, nấm và rau ăn kèm (2–3 người).',
    price: 289000,
    category: 'Món chính',
    featured: true,
    image_url: img(2673353),
  },
  {
    name: 'Bò lúc lắc khoai tây chiên',
    description: 'Thịt bò xào tỏi, ớt chuông và khoai tây chiên giòn.',
    price: 125000,
    category: 'Món chính',
    image_url: img(1567620),
  },
  {
    name: 'Cá kho tộ',
    description: 'Cá lóc kho tiêu, thịt mềm thấm gia vị — ăn với cơm trắng.',
    price: 89000,
    category: 'Món chính',
    image_url: img(2074130),
  },
  {
    name: 'Mực xào sả ớt',
    description: 'Mực tươi xào sả ớt, giữ độ giòn sần sật.',
    price: 115000,
    category: 'Món chính',
    onSale: true,
    image_url: img(1435735),
  },
  {
    name: 'Mì Quảng gà',
    description: 'Mì vàng Quảng Nam, gà xé, trứng cút và rau sống.',
    price: 62000,
    category: 'Món chính',
    image_url: img(1279330),
  },
  {
    name: 'Gà nướng mật ong',
    description: 'Cánh gà nướng mật ong, khoai lang nướng và salad rau.',
    price: 135000,
    category: 'Món chính',
    featured: true,
    image_url: img(1092730),
  },
  {
    name: 'Canh chua cá lóc',
    description: 'Canh chua miền Tây với cá lóc, bạc hà, cà chua và me.',
    price: 85000,
    category: 'Món chính',
    image_url: img(205961),
  },
  {
    name: 'Bún riêu cua',
    description: 'Bún riêu đậm đà, riêu cua, đậu hũ và rau ăn kèm.',
    price: 59000,
    category: 'Món chính',
    image_url: img(262978),
  },

  // —— Tráng miệng ——
  {
    name: 'Chè thái',
    description: 'Chè thái đủ topping: thạch, đu đủ, kem tươi và sữa dừa.',
    price: 38000,
    category: 'Tráng miệng',
    featured: true,
    image_url: img(3026809),
  },
  {
    name: 'Bánh flan caramel',
    description: 'Flan mềm mịn sốt caramel, phục vụ lạnh.',
    price: 32000,
    category: 'Tráng miệng',
    onSale: true,
    image_url: img(376464),
  },
  {
    name: 'Kem dừa non',
    description: 'Kem dừa đá xay, thơm béo, topping dừa nạo.',
    price: 35000,
    category: 'Tráng miệng',
    image_url: img(3026808),
  },
  {
    name: 'Yaourt dâu tươi',
    description: 'Sữa chua Hy Lạp, dâu tây và granola giòn.',
    price: 42000,
    category: 'Tráng miệng',
    image_url: img(1640774),
  },
  {
    name: 'Bánh da lợn',
    description: 'Bánh lá dứa — lớp bột nếp mềm, nhân đậu xanh.',
    price: 28000,
    category: 'Tráng miệng',
    image_url: img(842571),
  },
  {
    name: 'Sinh tố bơ',
    description: 'Sinh tố bơ sữa đặc, béo ngậy.',
    price: 45000,
    category: 'Tráng miệng',
    image_url: img(143133),
  },

  // —— Đồ uống ——
  {
    name: 'Trà đào cam sả',
    description: 'Trà đen, đào tươi, cam và sả — uống lạnh.',
    price: 39000,
    category: 'Đồ uống',
    featured: true,
    onSale: true,
    image_url: img(1199957),
  },
  {
    name: 'Cà phê sữa đá',
    description: 'Cà phê phin Robusta, sữa đặc — phong cách Sài Gòn.',
    price: 32000,
    category: 'Đồ uống',
    featured: true,
    image_url: img(725997),
  },
  {
    name: 'Nước ép thơm',
    description: 'Ép lạnh 100% trái thơm, không đường hóa học.',
    price: 35000,
    category: 'Đồ uống',
    image_url: img(248444),
  },
  {
    name: 'Sinh tố dâu',
    description: 'Dâu tươi xay sữa tươi, topping kem tươi.',
    price: 42000,
    category: 'Đồ uống',
    image_url: img(143133),
  },
  {
    name: 'Trà sữa trân châu',
    description: 'Trà sữa Đài Loan, trân châu đường đen dai mềm.',
    price: 45000,
    category: 'Đồ uống',
    featured: true,
    image_url: img(3026808),
  },
  {
    name: 'Mojito chanh dây',
    description: 'Mocktail chanh dây, bạc hà và soda — không cồn.',
    price: 48000,
    category: 'Đồ uống',
    image_url: img(410648),
  },
  {
    name: 'Bia Tiger lon',
    description: 'Bia lager mát lạnh 330ml.',
    price: 25000,
    category: 'Đồ uống',
    image_url: img(410648),
  },
  {
    name: 'Nước dừa tươi',
    description: 'Trái dừa xiêm, uống trực tiếp trong trái.',
    price: 30000,
    category: 'Đồ uống',
    image_url: img(725997),
  },
];

/**
 * Thực đơn theo chi nhánh — mỗi chi nhánh có bộ món khác nhau (có món đặc sản riêng).
 * Tên món phải khớp RESTAURANT_MENU_CATALOG hoặc nằm trong BRANCH_EXCLUSIVE_ITEMS.
 */
const BRANCH_MENU_NAMES = {
  1: [
    'Gỏi cuốn tôm thịt', 'Chả giò hải sản', 'Súp măng cua', 'Nộm đu đủ tôm khô',
    'Phở bò tái chín', 'Bún chả Hà Nội', 'Bún riêu cua', 'Canh chua cá lóc',
    'Bò lúc lắc khoai tây chiên', 'Gà nướng mật ong',
    'Chè thái', 'Bánh flan caramel', 'Kem dừa non',
    'Cà phê sữa đá', 'Trà đào cam sả', 'Trà sữa trân châu', 'Nước dừa tươi',
  ],
  2: [
    'Salad bò tái chanh', 'Bánh bao chiên nhân tôm', 'Nem nướng Nha Trang', 'Bánh tráng trộn',
    'Phở bò tái chín', 'Bún chả Hà Nội', 'Cá kho tộ', 'Mì Quảng gà', 'Bún bò Huế',
    'Chè thái', 'Bánh da lợn', 'Yaourt dâu tươi', 'Sinh tố bơ',
    'Cà phê sữa đá', 'Nước ép thơm', 'Bia Tiger lon', 'Mojito chanh dây',
  ],
  3: [
    'Gỏi cuốn tôm thịt', 'Chả giò hải sản', 'Salad bò tái chanh', 'Súp măng cua',
    'Phở bò tái chín', 'Bún riêu cua', 'Lẩu Thái hải sản', 'Mực xào sả ớt', 'Cơm gà xối mỡ',
    'Chè thái', 'Kem dừa non', 'Bánh flan caramel',
    'Trà đào cam sả', 'Sinh tố dâu', 'Trà sữa trân châu', 'Nước dừa tươi',
  ],
  4: [
    'Nem nướng Nha Trang', 'Bánh tráng trộn', 'Gỏi cuốn tôm thịt', 'Chả giò hải sản',
    'Mì Quảng gà', 'Bún bò Huế', 'Bánh xèo tôm thịt', 'Cá kho tộ', 'Mực xào sả ớt', 'Lẩu Thái hải sản',
    'Chè thái', 'Bánh da lợn', 'Sinh tố bơ',
    'Nước ép thơm', 'Mojito chanh dây', 'Bia Tiger lon', 'Nước dừa tươi',
  ],
  5: [
    'Gỏi cuốn tôm thịt', 'Chả giò hải sản', 'Nộm đu đủ tôm khô', 'Bánh bao chiên nhân tôm',
    'Cơm tấm sườn bì chả', 'Cơm gà xối mỡ', 'Bánh xèo tôm thịt', 'Canh chua cá lóc', 'Gà nướng mật ong',
    'Chè thái', 'Yaourt dâu tươi', 'Sinh tố bơ',
    'Cà phê sữa đá', 'Trà đào cam sả', 'Trà sữa trân châu', 'Sinh tố dâu',
  ],
  6: [
    'Salad bò tái chanh', 'Chả giò hải sản', 'Súp măng cua', 'Nem nướng Nha Trang',
    'Cơm tấm sườn bì chả', 'Bò lúc lắc khoai tây chiên', 'Cá kho tộ', 'Phở bò tái chín', 'Mì Quảng gà',
    'Bánh flan caramel', 'Kem dừa non', 'Chè thái',
    'Cà phê sữa đá', 'Nước ép thơm', 'Bia Tiger lon', 'Nước dừa tươi',
  ],
  7: [
    'Bánh tráng trộn', 'Gỏi cuốn tôm thịt', 'Bánh bao chiên nhân tôm', 'Nộm đu đủ tôm khô',
    'Cơm gà xối mỡ', 'Bánh xèo tôm thịt', 'Gà nướng mật ong', 'Bò lúc lắc khoai tây chiên',
    'Sinh tố bơ', 'Yaourt dâu tươi', 'Kem dừa non', 'Chè thái',
    'Trà sữa trân châu', 'Sinh tố dâu', 'Mojito chanh dây', 'Trà đào cam sả', 'Nước ép thơm',
  ],
};

/** Món đặc sản chỉ có tại từng chi nhánh */
const BRANCH_EXCLUSIVE_ITEMS = {
  1: [
    {
      name: 'Bún thang Hà Nội',
      description: 'Bún thang đầy đủ topping: thịt gà, chả, trứng cút, lòng và rau thơm.',
      price: 68000,
      category: 'Món chính',
      featured: true,
      image_url: img(262978),
    },
    {
      name: 'Phở gà Hà Nội',
      description: 'Phở gà ta nước trong, thịt mềm — đặc sản phố cổ.',
      price: 62000,
      category: 'Món chính',
      featured: true,
      onSale: true,
      image_url: img(357756),
    },
    {
      name: 'Bánh cuốn chả',
      description: 'Bánh cuốn nóng nhân thịt, chả quế, chấm nước mắm pha.',
      price: 52000,
      category: 'Khai vị',
      image_url: img(691114),
    },
  ],
  2: [
    {
      name: 'Bún đậu mắm tôm',
      description: 'Đậu rán, thịt luộc, chả cốm và mắm tôm pha chuẩn vị Hà Nội.',
      price: 75000,
      category: 'Món chính',
      featured: true,
      image_url: img(1437262),
    },
    {
      name: 'Cháo sườn sụn',
      description: 'Cháo nóng sườn heo sụn, hành phi và quẩy giòn.',
      price: 48000,
      category: 'Món chính',
      onSale: true,
      image_url: img(2474661),
    },
    {
      name: 'Bò nhúng dấm',
      description: 'Thịt bò tái nhúng nước dấm ớt, kèm bánh mì và rau thơm.',
      price: 135000,
      category: 'Món chính',
      featured: true,
      image_url: img(1567620),
    },
  ],
  3: [
    {
      name: 'Bún ốc Hà Nội',
      description: 'Bún ốc chuối đậu, nước dùng chua cay, ốc tươi luộc.',
      price: 65000,
      category: 'Món chính',
      featured: true,
      image_url: img(2291360),
    },
    {
      name: 'Xôi xéo',
      description: 'Xôi nếp vàng, đậu xanh, hành phi và ruốc tôm.',
      price: 35000,
      category: 'Khai vị',
      image_url: img(842571),
    },
    {
      name: 'Nem cua bể',
      description: 'Nem hải sản giòn rụm, nhân cua bể và tôm tươi.',
      price: 85000,
      category: 'Khai vị',
      featured: true,
      onSale: true,
      image_url: img(1126728),
    },
  ],
  4: [
    {
      name: 'Mì Quảng bò',
      description: 'Mì Quảng vàng, bò tái, trứng cút và rau sống đặc trưng miền Trung.',
      price: 72000,
      category: 'Món chính',
      featured: true,
      image_url: img(1279330),
    },
    {
      name: 'Bánh tráng cuốn thịt heo',
      description: 'Thịt heo luộc cuốn bánh tráng, rau rừng và mắm nêm.',
      price: 89000,
      category: 'Khai vị',
      featured: true,
      image_url: img(1435907),
    },
    {
      name: 'Cơm hến xứ Huế',
      description: 'Cơm hến đậm đà, hến xào, rau răm và đậu phộng.',
      price: 55000,
      category: 'Món chính',
      onSale: true,
      image_url: img(958545),
    },
  ],
  5: [
    {
      name: 'Hủ tiếu Nam Vang',
      description: 'Hủ tiếu Sài Gòn, tôm thịt, gan và trứng cút.',
      price: 68000,
      category: 'Món chính',
      featured: true,
      image_url: img(262978),
    },
    {
      name: 'Cơm tấm đặc biệt',
      description: 'Sườn bì chả trứng, bì heo và nước mắm ớt pha sẵn.',
      price: 79000,
      category: 'Món chính',
      featured: true,
      onSale: true,
      image_url: img(958545),
    },
    {
      name: 'Bánh mì thịt nướng',
      description: 'Bánh mì giòn, thịt nướng than, đồ chua và pate.',
      price: 42000,
      category: 'Khai vị',
      image_url: img(3023476),
    },
  ],
  6: [
    {
      name: 'Mì hoành thánh',
      description: 'Mì trứng hoành thánh nhân tôm thịt, nước dùng gà ngọt.',
      price: 58000,
      category: 'Món chính',
      featured: true,
      image_url: img(1279330),
    },
    {
      name: 'Sườn cơm Hoa',
      description: 'Sườn non chiên giòn, cơm trắng và canh chua.',
      price: 72000,
      category: 'Món chính',
      image_url: img(70497),
    },
    {
      name: 'Há cảo tôm',
      description: 'Há cảo hấp nhân tôm tươi, chấm tương đen.',
      price: 65000,
      category: 'Khai vị',
      featured: true,
      onSale: true,
      image_url: img(691114),
    },
  ],
  7: [
    {
      name: 'Gà popcorn sốt phô mai',
      description: 'Gà viên giòn phủ sốt phô mai — món best-seller giới trẻ.',
      price: 89000,
      category: 'Món chính',
      featured: true,
      image_url: img(1092730),
    },
    {
      name: 'Pizza cỡ nhỏ hải sản',
      description: 'Pizza 20cm nhân tôm mực, phô mai mozzarella.',
      price: 125000,
      category: 'Món chính',
      featured: true,
      onSale: true,
      image_url: img(1438672),
    },
    {
      name: 'Kem trà xanh matcha',
      description: 'Kem matcha Nhật, topping trân châu đường đen.',
      price: 48000,
      category: 'Tráng miệng',
      image_url: img(3026808),
    },
  ],
};

/** Món bán chạy ưu tiên khi seed order (tên món theo chi nhánh) */
const BRANCH_BESTSELLER_NAMES = {
  1: ['Phở bò tái chín', 'Bún chả Hà Nội', 'Bún thang Hà Nội'],
  2: ['Bún đậu mắm tôm', 'Phở bò tái chín', 'Bò nhúng dấm'],
  3: ['Bún ốc Hà Nội', 'Lẩu Thái hải sản', 'Phở bò tái chín'],
  4: ['Mì Quảng bò', 'Bún bò Huế', 'Bánh xèo tôm thịt'],
  5: ['Cơm tấm đặc biệt', 'Hủ tiếu Nam Vang', 'Cơm tấm sườn bì chả'],
  6: ['Mì hoành thánh', 'Cơm tấm sườn bì chả', 'Há cảo tôm'],
  7: ['Gà popcorn sốt phô mai', 'Trà sữa trân châu', 'Pizza cỡ nhỏ hải sản'],
};

/** Hệ số giá theo chi nhánh (HCM cao hơn một chút) */
const BRANCH_PRICE_FACTOR = {
  1: 1,
  2: 1,
  3: 0.98,
  4: 1.02,
  5: 1.05,
  6: 1.04,
  7: 1.03,
};

function roundPriceVnd(amount) {
  return Math.max(1000, Math.round(amount / 1000) * 1000);
}

function branchPrice(basePrice, branchId) {
  const factor = BRANCH_PRICE_FACTOR[branchId] ?? 1;
  return roundPriceVnd(basePrice * factor);
}

function getCatalogItemsForBranch(branchId) {
  const catalogByName = new Map(RESTAURANT_MENU_CATALOG.map((item) => [item.name, item]));
  const names = BRANCH_MENU_NAMES[branchId];
  const fromCatalog = names
    ? names.map((name) => catalogByName.get(name)).filter(Boolean)
    : RESTAURANT_MENU_CATALOG;
  const exclusive = BRANCH_EXCLUSIVE_ITEMS[branchId] || [];
  return [...fromCatalog, ...exclusive];
}

function buildMenuRowsForBranch(branchId, createdAt = new Date()) {
  return getCatalogItemsForBranch(branchId).map((item) => {
    const price = branchPrice(item.price, branchId);
    const is_featured = Boolean(item.featured);
    let sale_price = null;
    if (item.onSale) {
      const pct = item.salePercent ?? 0.85;
      sale_price = roundPriceVnd(price * pct);
      if (sale_price >= price) sale_price = roundPriceVnd(price * 0.9);
    }

    return {
      branch_id: branchId,
      name: item.name,
      description: item.description,
      price,
      sale_price,
      category: item.category,
      is_available: true,
      is_featured,
      created_at: createdAt,
      image_url: item.image_url,
    };
  });
}

module.exports = {
  RESTAURANT_MENU_CATALOG,
  BRANCH_MENU_NAMES,
  BRANCH_EXCLUSIVE_ITEMS,
  BRANCH_BESTSELLER_NAMES,
  BRANCH_PRICE_FACTOR,
  getCatalogItemsForBranch,
  buildMenuRowsForBranch,
  roundPriceVnd,
  branchPrice,
};
