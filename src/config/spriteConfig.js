// 精灵配置文件，描述不同移动物的特性
export const spriteConfig = {
  // 猫的配置
  cat: {
    size: { width: 32, height: 32 },
    images: [
      '/images/pet/cat/cat1.png',
      '/images/pet/cat/cat2.png',
      '/images/pet/cat/cat3.png',
      '/images/pet/cat/cat4.png',
      '/images/pet/cat/cat5.png'
    ],
    speed: 0.5,
    moveInterval: 5000, // 默认移动间隔
    forbiddenTileIds: [8, 9, 13, 14, 15, 16, 17, 18, 19, 20,21, 22, 23] // 默认禁止移动到的瓦片ID
  },
  // 狐狸的配置
  fox: {
    size: { width: 36, height: 36 },
    images: [
      '/images/pet/fox/fox1.png',
      '/images/pet/fox/fox2.png',
      '/images/pet/fox/fox3.png',
      '/images/pet/fox/fox4.png',
      '/images/pet/fox/fox5.png'
    ],
    speed: 0.6,
    moveInterval: 10000, // 默认移动间隔
    forbiddenTileIds: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,21, 22, 23], // 默认禁止移动到的瓦片ID
    func: {
      "4": (statsStore) => {
        // 增加生态值
        if (statsStore) {
          statsStore.updateBiodiversity(5) // 每次增加5点生态值
        }
        return {
          type: 'biodiversity',
          value: 5
        }
      }
    }
  },
  // 女孩的配置
  people: {
    size: { width: 30, height: 48 },
    images: [
      '/images/people/girl1.png',
      '/images/people/girl2.png',
      '/images/people/girl3.png',
      '/images/people/girl4.png',
      '/images/people/girl5.png'
    ],
    speed: 0.4,
    moveInterval: 2500, // 默认移动间隔
    forbiddenTileIds: [1, 2, 3, 4, 8, 9], // 默认禁止移动到的瓦片ID
    func: {
      "10": (statsStore) => {
        // 增加好感度
        if (statsStore) {
          statsStore.updateCulture(10) // 每次增加10点好感度
        }
        return {
          type: 'culture',
          value: 5
        }
      },
      "11": (statsStore) => {
        // 增加文化值
        if (statsStore) {
          statsStore.updateCulture(10) // 每次增加10点文化值
        }
        return {
          type: 'culture',
          value: 10
        }
      },
      "12": (statsStore) => {
        // 增加文化值
        if (statsStore) {
          statsStore.updateCulture(10) // 每次增加10点文化值
        }
        return {
          type: 'culture',
          value: 10
        }
      }
    }
  }
}

// 获取特定类型的精灵配置
export const getSpriteConfig = (type) => {
  return spriteConfig[type] || spriteConfig.cat // 默认返回猫的配置
}
