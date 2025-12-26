// 地图配置参数
export const mapConfig = {
  // 瓦片参数
  tileWidth: 128,
  tileHeight: 128,
  ntiles: 7,
  
  // 地图容器参数
  containerWidth: 910,
  containerHeight: 910,
  
  // 缩放参数
  minZoom: 0.5,
  maxZoom: 2,
  zoomStep: 0.1,
  
  // 存储键名
  storageKey: 'mapState',
  
  // 瓦片配置列表
  tiles: [
    { id: 1, name: '草坪1', image: '/images/plant-1.jpg', type: 'plant', price: 10, value: { biodiversity: 10,culture: 5},  description: '增加城市绿化率，提升生物多样性' },
    { id: 2, name: '田地1', image: '/images/farmland-1.png', type: 'farmland', price: 60, func: 'timer', change: { targetId: 3, duration: 10, stages: [2, 3] }, value: { biodiversity: 5, culture: 5 }, description: '田地可以生成为稻田，稻田收割后可以增加碳积分' },
    { id: 3, name: '田地2', image: '/images/farmland-2.png', type: 'farmland', price: -1, func: 'hover-tip', change: { isFinal: true, stages: [2, 3] }, harvest: { targetId: 2, reward: 100 }, value: { biodiversity: 5, culture: 5 }, description: '稻田收割后可以增加碳积分', hoverTip: '双击收割' },
    { id: 4, name: '植物1', image: '/images/plant-2.png', type: 'plant', price: 60, value: { biodiversity: 10, culture: 5 }, description: '增加城市绿化率，提升生物多样性' },
    { id: 5, name: '草路1', image: '/images/plant-road-1.jpg', type: 'plant-road', price: 80, value: { biodiversity: 5, culture: 3 }, description: '城市建设组件' },
    { id: 6, name: '石路1', image: '/images/stone-road-1.png', type: 'stone-road', price: 100, value: { biodiversity: 10, culture: 5 }, description: '城市建设组件' },
    { id: 7, name: '石路2', image: '/images/stone-road-2.jpg', type: 'stone-road', price: 90, value: { biodiversity: 10, culture: 5 }, description: '城市建设组件' },
    { id: 8, name: '水域1', image: '/images/sea-1.jpg', type: 'sea', price: 120, value: { biodiversity: 40, culture: 10 }, description: '美化城市景观，提升生态环境' },
    { id: 9, name: '水域2', image: '/images/sea-2.jpg', type: 'sea', price: 85, value: { biodiversity: 40, culture: 10 }, description: '美化城市景观，提升生态环境' },
    //
    { id: 10, name: '武大宿舍', image: '/images/house-1.png', type: 'residence', price: 300, value: { biodiversity: 0, culture: 15 }, description: '武汉大学学生宿舍，提供舒适的居住环境' },
    { id: 11, name: '武大商店', image: '/images/buildings_processed/store.png', type: 'residence', price: 250, value: { biodiversity: 0, culture: 15 }, description: '武汉大学学生宿舍，提供舒适的居住环境' },
    { id: 12, name: '教学楼', image: '/images/residence-1.png', type: 'residence', price: 300, value: { biodiversity: 0, culture: 20 }, description: '武汉大学学生宿舍，提供舒适的居住环境' },
    //
    { id: 13, name: '道路1-1', image: '/images/road-1-1.png', type: 'road', price: 100, value: { biodiversity: 0, culture: 5 }, description: '优化交通网络，提高通行效率' },
    { id: 14, name: '道路1-2', image: '/images/road-1-2.png', type: 'road', price: 100, value: { biodiversity: 0, culture: 5 }, description: '优化交通网络，提高通行效率' },
    { id: 15, name: '道路2-1', image: '/images/road-2-1.png', type: 'road', price: 100, value: { biodiversity: 0, culture: 5 }, description: '优化交通网络，提高通行效率' },
    { id: 16, name: '道路2-2', image: '/images/road-2-2.png', type: 'road', price: 100, value: { biodiversity: 0, culture: 5 }, description: '优化交通网络，提高通行效率' },
    { id: 17, name: '道路2-3', image: '/images/road-2-3.png', type: 'road', price: 100, value: { biodiversity: 0, culture: 5 }, description: '优化交通网络，提高通行效率' },
    { id: 18, name: '道路2-4', image: '/images/road-2-4.jpg', type: 'road', price: 100, value: { biodiversity: 0, culture: 5 }, description: '优化交通网络，提高通行效率' },
    { id: 19, name: '道路3-1', image: '/images/road-3-1.png', type: 'road', price: 100, value: { biodiversity: 0, culture: 5 }, description: '优化交通网络，提高通行效率' },
    { id: 20, name: '道路3-2', image: '/images/road-3-2.png', type: 'road', price: 100, value: { biodiversity: 0, culture: 5 }, description: '优化交通网络，提高通行效率' },
    { id: 21, name: '道路3-3', image: '/images/road-3-3.png', type: 'road', price: 100, value: { biodiversity: 0, culture: 5 }, description: '优化交通网络，提高通行效率' },
    { id: 22, name: '道路3-4', image: '/images/road-3-4.jpg', type: 'road', price: 100, value: { biodiversity: 0, culture: 5 }, description: '优化交通网络，提高通行效率' },
    { id: 23, name: '道路4', image: '/images/road-4.png', type: 'road', price: 100, value: { biodiversity: 0, culture: 5 }, description: '优化交通网络，提高通行效率' },
  ]
}
