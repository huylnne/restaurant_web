'use strict';

/** Ảnh Unsplash — ổn định, crop 800px */
function img(photoId) {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=800&q=80`;
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
    image_url: img('1624365243769-746bbdf4120e'),
  },
  {
    name: 'Nem nướng Nha Trang',
    description: 'Nem nướng than hoa, ăn kèm bánh hỏi, rau sống và mắm nêm đậm đà.',
    price: 69000,
    category: 'Khai vị',
    featured: true,
    image_url: img('1529042410759-b54ad4dffb6f'),
  },
  {
    name: 'Bánh tráng trộn',
    description: 'Bánh tráng sợi trộn tôm khô, rau răm, xoài xanh và sốt me cay nhẹ.',
    price: 39000,
    category: 'Khai vị',
    image_url: img('1609501676728-1a3b1e72c8c8'),
  },
  {
    name: 'Chả giò hải sản',
    description: 'Chả giò giòn rụm nhân tôm mực, ăn kèm nước mắm chua ngọt.',
    price: 55000,
    category: 'Khai vị',
    onSale: true,
    image_url: img('1633279256928-52717a21b42c'),
  },
  {
    name: 'Salad bò tái chanh',
    description: 'Thịt bò tái, rau xà lách, cà chua bi và sốt chanh leo.',
    price: 72000,
    category: 'Khai vị',
    image_url: img('1541544181051-e466207bc0b6'),
  },
  {
    name: 'Súp măng cua',
    description: 'Súp nóng măng tươi, cua đồng và trứng cút — vị thanh ngọt.',
    price: 48000,
    category: 'Khai vị',
    image_url: img('1547592166-23ac45744acd-5a5f66012dbf'),
  },
  {
    name: 'Nộm đu đủ tôm khô',
    description: 'Đu đủ xanh, tôm khô, đậu phộng rang và mắm ruốc Huế.',
    price: 42000,
    category: 'Khai vị',
    image_url: img('1512621776951-a57141f2eefd'),
  },
  {
    name: 'Bánh bao chiên nhân tôm',
    description: 'Bánh bao vàng ăn kèm tương ớt và dưa leo.',
    price: 36000,
    category: 'Khai vị',
    image_url: img('1498346443299-41b497a0f2c6'),
  },

  // —— Món chính ——
  {
    name: 'Phở bò tái chín',
    description: 'Phở bò Hà Nội nước dùng ninh xương 12 giờ, thịt tái và bò viên.',
    price: 75000,
    category: 'Món chính',
    featured: true,
    onSale: true,
    image_url: img('1591814468924-caf38d305745'),
  },
  {
    name: 'Bún chả Hà Nội',
    description: 'Chả nướng than, bún tươi, rau thơm và nước mắm pha chua ngọt.',
    price: 68000,
    category: 'Món chính',
    featured: true,
    image_url: img('1559339352-11d035aa65de'),
  },
  {
    name: 'Cơm tấm sườn bì chả',
    description: 'Sườn nướng, bì, chả trứng, đồ chua và nước mắm ớt.',
    price: 65000,
    category: 'Món chính',
    featured: true,
    image_url: img('1603133872871-684c761f995d'),
  },
  {
    name: 'Bún bò Huế',
    description: 'Bún bò cay nồng, giò heo, chả cua và rau chuối.',
    price: 72000,
    category: 'Món chính',
    featured: true,
    image_url: img('1569718212165-3a8278d5f624'),
  },
  {
    name: 'Cơm gà xối mỡ',
    description: 'Đùi gà chiên giòn rưới mỡ hành, cơm trắng và canh rau.',
    price: 58000,
    category: 'Món chính',
    onSale: true,
    image_url: img('1626082927389-6cd097cdc6ec'),
  },
  {
    name: 'Bánh xèo tôm thịt',
    description: 'Bánh xèo vàng giòn nhân tôm thịt, ăn kèm rau sống và mắm nêm.',
    price: 79000,
    category: 'Món chính',
    featured: true,
    image_url: img('1628840043775-a58e21326ff2'),
  },
  {
    name: 'Lẩu Thái hải sản',
    description: 'Lẩu chua cay Tom Yum, tôm, mực, nấm và rau ăn kèm (2–3 người).',
    price: 289000,
    category: 'Món chính',
    featured: true,
    image_url: img('1563379926898-05f4575a58d8'),
  },
  {
    name: 'Bò lúc lắc khoai tây chiên',
    description: 'Thịt bò xào tỏi, ớt chuông và khoai tây chiên giòn.',
    price: 125000,
    category: 'Món chính',
    image_url: img('1544025162-d76694265947'),
  },
  {
    name: 'Cá kho tộ',
    description: 'Cá lóc kho tiêu, thịt mềm thấm gia vị — ăn với cơm trắng.',
    price: 89000,
    category: 'Món chính',
    image_url: img('1519708227418-f8de9a03dd51'),
  },
  {
    name: 'Mực xào sả ớt',
    description: 'Mực tươi xào sả ớt, giữ độ giòn sần sật.',
    price: 115000,
    category: 'Món chính',
    onSale: true,
    image_url: img('1565680018434-f9f02d5b3f0c'),
  },
  {
    name: 'Mì Quảng gà',
    description: 'Mì vàng Quảng Nam, gà xé, trứng cút và rau sống.',
    price: 62000,
    category: 'Món chính',
    image_url: img('1498654896293-37aecda6141e'),
  },
  {
    name: 'Gà nướng mật ong',
    description: 'Cánh gà nướng mật ong, khoai lang nướng và salad rau.',
    price: 135000,
    category: 'Món chính',
    featured: true,
    image_url: img('1598103442097-979d0ecc8c72'),
  },
  {
    name: 'Canh chua cá lóc',
    description: 'Canh chua miền Tây với cá lóc, bạc hà, cà chua và me.',
    price: 85000,
    category: 'Món chính',
    image_url: img('1585036495448-575feef04f1e'),
  },
  {
    name: 'Bún riêu cua',
    description: 'Bún riêu đậm đà, riêu cua, đậu hũ và rau ăn kèm.',
    price: 59000,
    category: 'Món chính',
    image_url: img('1582878826629-29b7ad1cdc43'),
  },

  // —— Tráng miệng ——
  {
    name: 'Chè thái',
    description: 'Chè thái đủ topping: thạch, đu đủ, kem tươi và sữa dừa.',
    price: 38000,
    category: 'Tráng miệng',
    featured: true,
    image_url: img('1551024506-0bccd281d327'),
  },
  {
    name: 'Bánh flan caramel',
    description: 'Flan mềm mịn sốt caramel, phục vụ lạnh.',
    price: 32000,
    category: 'Tráng miệng',
    onSale: true,
    image_url: img('1488477181946-f8e0d44c9b8a'),
  },
  {
    name: 'Kem dừa non',
    description: 'Kem dừa đá xay, thơm béo, topping dừa nạo.',
    price: 35000,
    category: 'Tráng miệng',
    image_url: img('1563805042-7684c019e1cb'),
  },
  {
    name: 'Yaourt dâu tươi',
    description: 'Sữa chua Hy Lạp, dâu tây và granola giòn.',
    price: 42000,
    category: 'Tráng miệng',
    image_url: img('1488477181946-f8e0d44c9b8a'),
  },
  {
    name: 'Bánh da lợn',
    description: 'Bánh lá dứa — lớp bột nếp mềm, nhân đậu xanh.',
    price: 28000,
    category: 'Tráng miệng',
    image_url: img('1587241327520-87abd5c1b8c0'),
  },
  {
    name: 'Sinh tố bơ',
    description: 'Sinh tố bơ sữa đặc, béo ngậy.',
    price: 45000,
    category: 'Tráng miệng',
    image_url: img('1623428187502-432d65e3882b'),
  },

  // —— Đồ uống ——
  {
    name: 'Trà đào cam sả',
    description: 'Trà đen, đào tươi, cam và sả — uống lạnh.',
    price: 39000,
    category: 'Đồ uống',
    featured: true,
    onSale: true,
    image_url: img('1556679343-1c2e2b4bd0a0'),
  },
  {
    name: 'Cà phê sữa đá',
    description: 'Cà phê phin Robusta, sữa đặc — phong cách Sài Gòn.',
    price: 32000,
    category: 'Đồ uống',
    featured: true,
    image_url: img('1514433905131-48fbf4a4038f'),
  },
  {
    name: 'Nước ép thơm',
    description: 'Ép lạnh 100% trái thơm, không đường hóa học.',
    price: 35000,
    category: 'Đồ uống',
    image_url: img('1546175070-1ab587e68c92'),
  },
  {
    name: 'Sinh tố dâu',
    description: 'Dâu tươi xay sữa tươi, topping kem tươi.',
    price: 42000,
    category: 'Đồ uống',
    image_url: img('1505252580775-8d38b1a6ba3f'),
  },
  {
    name: 'Trà sữa trân châu',
    description: 'Trà sữa Đài Loan, trân châu đường đen dai mềm.',
    price: 45000,
    category: 'Đồ uống',
    featured: true,
    image_url: img('1621263764928-df1444c5e859'),
  },
  {
    name: 'Mojito chanh dây',
    description: 'Mocktail chanh dây, bạc hà và soda — không cồn.',
    price: 48000,
    category: 'Đồ uống',
    image_url: img('1551538827-9d37f1f8f0c0'),
  },
  {
    name: 'Bia Tiger lon',
    description: 'Bia lager mát lạnh 330ml.',
    price: 25000,
    category: 'Đồ uống',
    image_url: img('1608275664059-8c9f1f1c8f1d'),
  },
  {
    name: 'Nước dừa tươi',
    description: 'Trái dừa xiêm, uống trực tiếp trong trái.',
    price: 30000,
    category: 'Đồ uống',
    image_url: img('1553530666-ba11a7d000fd'),
  },
];

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

function buildMenuRowsForBranch(branchId, createdAt = new Date()) {
  return RESTAURANT_MENU_CATALOG.map((item) => {
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
      is_active: true,
      is_featured,
      created_at: createdAt,
      image_url: item.image_url,
    };
  });
}

module.exports = {
  RESTAURANT_MENU_CATALOG,
  BRANCH_PRICE_FACTOR,
  buildMenuRowsForBranch,
  roundPriceVnd,
  branchPrice,
};
