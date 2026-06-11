const GameData = {
    names: {
        firstNames: ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗'],
        lastNames: ['伟', '芳', '娜', '敏', '静', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀英', '华', '丽', '刚']
    },

    diseases: [
        { 
            id: 'flu', 
            name: '普通流感', 
            severity: 'mild', 
            infectious: true, 
            baseHealDays: 5,
            damagePerDay: 2,
            desc: '轻症，传染性一般，治疗较容易'
        },
        { 
            id: 'pneumonia', 
            name: '肺炎', 
            severity: 'severe', 
            infectious: true, 
            baseHealDays: 10,
            damagePerDay: 5,
            desc: '重症，具有传染性，需要隔离治疗'
        },
        { 
            id: 'infection', 
            name: '伤口感染', 
            severity: 'moderate', 
            infectious: false, 
            baseHealDays: 7,
            damagePerDay: 3,
            desc: '中症，不传染，需要抗生素治疗'
        },
        { 
            id: 'plague', 
            name: '烈性瘟疫', 
            severity: 'critical', 
            infectious: true, 
            baseHealDays: 14,
            damagePerDay: 8,
            desc: '危重症，高传染性，必须立即隔离！'
        }
    ],

    traits: [
        { id: 'strong', name: '强壮', desc: '战斗力+20%，探索效率+10%', type: 'physical', effect: { combat: 0.2, explore: 0.1 } },
        { id: 'smart', name: '聪明', desc: '研究效率+30%，医疗能力+20%', type: 'mental', effect: { research: 0.3, medical: 0.2 } },
        { id: 'hardworking', name: '勤劳', desc: '工作效率+25%', type: 'work', effect: { work: 0.25 } },
        { id: 'cooking', name: '会做饭', desc: '食物产出+20%，提升士气', type: 'skill', effect: { food: 0.2, morale: 5 } },
        { id: 'medical', name: '医学背景', desc: '治疗效果+50%', type: 'skill', effect: { healing: 0.5 } },
        { id: 'engineer', name: '工程师', desc: '建造速度+30%，维修效率+40%', type: 'skill', effect: { build: 0.3, repair: 0.4 } },
        { id: 'scout', name: '侦察兵', desc: '探索速度+30%，发现物资+20%', type: 'skill', effect: { explore: 0.3, loot: 0.2 } },
        { id: 'leadership', name: '领导力', desc: '全员士气+10%', type: 'social', effect: { teamMorale: 0.1 } },
        { id: 'optimistic', name: '乐观', desc: '自身士气恢复+50%', type: 'mental', effect: { selfMorale: 0.5 } },
        { id: 'paranoid', name: '多疑', desc: '警觉性+30%，但士气-10%', type: 'mental', effect: { alert: 0.3, morale: -10 } },
        { id: 'sickly', name: '体弱多病', desc: '生病概率+30%', type: 'physical', effect: { sickChance: 0.3 } },
        { id: 'lucky', name: '幸运', desc: '探索时好事件概率+25%', type: 'luck', effect: { luck: 0.25 } },
        { id: 'gardener', name: '园艺', desc: '种植产出+40%', type: 'skill', effect: { farming: 0.4 } },
        { id: 'mechanic', name: '机械师', desc: '电力维修效率+50%', type: 'skill', effect: { powerRepair: 0.5 } },
        { id: 'silver_tongue', name: '能说会道', desc: '谈判成功率+30%', type: 'social', effect: { negotiate: 0.3 } }
    ],

    jobs: [
        { id: 'idle', name: '空闲', desc: '未分配工作', icon: '😴' },
        { id: 'scavenger', name: '拾荒者', desc: '外出搜寻物资', icon: '🎒' },
        { id: 'farmer', name: '种植员', desc: '在种植室生产食物', icon: '🌱' },
        { id: 'water_worker', name: '净水工', desc: '净化水源', icon: '🚰' },
        { id: 'builder', name: '建筑工', desc: '建造和维修房间', icon: '🔨' },
        { id: 'doctor', name: '医生', desc: '治疗病患', icon: '👨‍⚕️' },
        { id: 'guard', name: '守卫', desc: '保卫避难楼安全', icon: '💂' },
        { id: 'chef', name: '厨师', desc: '烹饪食物提升士气', icon: '👨‍🍳' },
        { id: 'scientist', name: '研究员', desc: '研究新技术', icon: '🔬' }
    ],

    rooms: [
        { 
            id: 'dormitory', 
            name: '宿舍', 
            desc: '提供4个床位', 
            icon: '🛏️', 
            cost: { materials: 15 },
            capacity: 4,
            category: 'living'
        },
        { 
            id: 'canteen', 
            name: '食堂', 
            desc: '提升士气，需要厨师', 
            icon: '🍽️', 
            cost: { materials: 20 },
            category: 'living'
        },
        { 
            id: 'medical_room', 
            name: '医疗室', 
            desc: '治疗伤病，2张病床', 
            icon: '🏥', 
            cost: { materials: 25, parts: 5 },
            beds: 2,
            category: 'medical'
        },
        { 
            id: 'quarantine', 
            name: '隔离区', 
            desc: '隔离传染病人，2张床', 
            icon: '⚠️', 
            cost: { materials: 20 },
            beds: 2,
            category: 'medical'
        },
        { 
            id: 'farm', 
            name: '种植室', 
            desc: '生产食物', 
            icon: '🌱', 
            cost: { materials: 30, parts: 3 },
            production: { food: 3 },
            workers: 2,
            category: 'production'
        },
        { 
            id: 'water_plant', 
            name: '净水室', 
            desc: '净化水源', 
            icon: '💧', 
            cost: { materials: 25, parts: 5 },
            production: { water: 4 },
            workers: 1,
            category: 'production'
        },
        { 
            id: 'workshop', 
            name: '工坊', 
            desc: '生产材料和零件', 
            icon: '🔧', 
            cost: { materials: 35, parts: 5 },
            production: { materials: 2 },
            workers: 2,
            category: 'production'
        },
        { 
            id: 'power_room', 
            name: '发电室', 
            desc: '提供电力供应', 
            icon: '⚡', 
            cost: { materials: 40, parts: 10 },
            powerOutput: 5,
            workers: 1,
            category: 'utility'
        },
        { 
            id: 'storage', 
            name: '仓库', 
            desc: '增加物资存储上限', 
            icon: '📦', 
            cost: { materials: 20 },
            storageBonus: 100,
            category: 'utility'
        },
        { 
            id: 'guard_post', 
            name: '岗亭', 
            desc: '提升防御力', 
            icon: '🛡️', 
            cost: { materials: 25, parts: 3 },
            defense: 10,
            workers: 1,
            category: 'security'
        },
        { 
            id: 'gate', 
            name: '大门', 
            desc: '入口门禁系统', 
            icon: '🚪', 
            cost: { materials: 30, parts: 8 },
            defense: 20,
            category: 'security'
        },
        { 
            id: 'recreation', 
            name: '娱乐室', 
            desc: '提升居民士气', 
            icon: '🎮', 
            cost: { materials: 20 },
            moraleBonus: 5,
            category: 'living'
        },
        { 
            id: 'lab', 
            name: '研究室', 
            desc: '研究各种技术', 
            icon: '🔬', 
            cost: { materials: 30, parts: 8 },
            category: 'utility'
        }
    ],

    locations: [
        {
            id: 'supermarket',
            name: '超市',
            desc: '附近的废弃超市，可能有食物和水',
            distance: 1,
            duration: 1,
            danger: 0.1,
            loot: { food: [5, 15], water: [3, 10], materials: [0, 5] },
            icon: '🏪'
        },
        {
            id: 'pharmacy',
            name: '药店',
            desc: '废弃药店，有医疗物资',
            distance: 2,
            duration: 1,
            danger: 0.15,
            loot: { medicine: [3, 8], bandage: [2, 6] },
            icon: '💊'
        },
        {
            id: 'hospital',
            name: '医院',
            desc: '大型医院，物资丰富但危险',
            distance: 3,
            duration: 2,
            danger: 0.35,
            loot: { medicine: [8, 20], bandage: [5, 15], parts: [2, 8] },
            icon: '🏥'
        },
        {
            id: 'hardware',
            name: '五金店',
            desc: '可以找到工具和材料',
            distance: 2,
            duration: 1,
            danger: 0.15,
            loot: { materials: [8, 18], parts: [2, 6] },
            icon: '🔧'
        },
        {
            id: 'residential',
            name: '居民区',
            desc: '废弃公寓楼，物资分散',
            distance: 1,
            duration: 1,
            danger: 0.2,
            loot: { food: [3, 10], water: [2, 8], materials: [2, 8], entertainment: [0, 2] },
            icon: '🏢'
        },
        {
            id: 'factory',
            name: '工厂',
            desc: '废弃工厂，有大量材料和零件',
            distance: 4,
            duration: 2,
            danger: 0.4,
            loot: { materials: [15, 30], parts: [5, 15] },
            icon: '🏭'
        },
        {
            id: 'school',
            name: '学校',
            desc: '废弃学校，可能有幸存者',
            distance: 2,
            duration: 1,
            danger: 0.25,
            loot: { food: [2, 8], water: [2, 6], books: [1, 4] },
            special: 'survivors',
            icon: '🏫'
        },
        {
            id: 'military',
            name: '军事基地',
            desc: '危险但物资极其丰富',
            distance: 5,
            duration: 3,
            danger: 0.6,
            loot: { food: [10, 25], water: [8, 20], medicine: [5, 12], materials: [10, 25], parts: [8, 20] },
            icon: '🎖️'
        }
    ],

    events: {
        stranger: [
            {
                id: 'stranger_family',
                title: '陌生人来访',
                desc: '一家三口敲响了避难楼的大门，他们看起来很虚弱，请求进入避难。',
                type: 'stranger',
                choices: [
                    { id: 'accept', text: '接纳他们', effect: { addResidents: 3, food: -10, water: -10, morale: 5 } },
                    { id: 'negotiate', text: '谈判（需要物资交换）', effect: { addResidents: 2, food: -5, materials: 10 } },
                    { id: 'refuse', text: '拒绝', effect: { morale: -5 } }
                ]
            },
            {
                id: 'stranger_trader',
                title: '商人来访',
                desc: '一个背着大包的商人来到门口，说可以用物资交换。',
                type: 'stranger',
                choices: [
                    { id: 'trade_food', text: '用材料换食物（材料-20, 食物+30）', effect: { materials: -20, food: 30 } },
                    { id: 'trade_med', text: '用材料换药品（材料-15, 药品+12）', effect: { materials: -15, medicine: 12 } },
                    { id: 'refuse', text: '不交易', effect: {} }
                ]
            },
            {
                id: 'stranger_beggar',
                title: '流浪者',
                desc: '一个衣衫褴褛的流浪者在门外徘徊，看起来很饿。',
                type: 'stranger',
                choices: [
                    { id: 'give_food', text: '给他一些食物（食物-3）', effect: { food: -3, morale: 3 } },
                    { id: 'accept', text: '让他进来', effect: { addResidents: 1, morale: 2 } },
                    { id: 'drive_away', text: '赶走', effect: { morale: -3 } }
                ]
            }
        ],
        disaster: [
            {
                id: 'fire',
                title: '火灾！',
                desc: '三楼突然起火！火势正在蔓延，需要立即处理！',
                type: 'disaster',
                urgent: true,
                choices: [
                    { id: 'fight', text: '组织灭火', effect: { materials: -10, damageRoom: 1 } },
                    { id: 'evacuate', text: '紧急疏散', effect: { damageRoom: 2, morale: -10 } }
                ]
            },
            {
                id: 'water_leak',
                title: '水管破裂',
                desc: '地下水管破裂，大量水源正在流失！',
                type: 'disaster',
                choices: [
                    { id: 'repair', text: '立即修复', effect: { materials: -8, parts: -2, water: -5 } },
                    { id: 'wait', text: '先收集漏水', effect: { water: -15, damageRoom: 1 } }
                ]
            },
            {
                id: 'power_outage',
                title: '电力故障',
                desc: '发电机出现故障，整栋楼陷入黑暗。',
                type: 'disaster',
                choices: [
                    { id: 'repair', text: '紧急维修', effect: { parts: -5, materials: -5 } },
                    { id: 'wait', text: '凑合用蜡烛', effect: { morale: -8, productionPenalty: 0.3 } }
                ]
            },
            {
                id: 'raid',
                title: '强盗来袭！',
                desc: '一群武装强盗正在攻击避难楼！必须立即组织防御！',
                type: 'disaster',
                urgent: true,
                choices: [
                    { id: 'fight', text: '全力抵抗', effect: { injuredResidents: 1, materials: -5 } },
                    { id: 'negotiate', text: '用物资换取和平', effect: { food: -20, water: -15, materials: -10 } },
                    { id: 'surrender', text: '开门让他们拿', effect: { food: -30, water: -20, materials: -20, morale: -20 } }
                ]
            }
        ],
        internal: [
            {
                id: 'fight',
                title: '居民争吵',
                desc: '两名居民因为食物分配问题发生了激烈争吵，其他人也在围观。',
                type: 'internal',
                choices: [
                    { id: 'mediate', text: '耐心调解', effect: { morale: -2 } },
                    { id: 'punish', text: '严厉惩罚闹事者', effect: { morale: -8, orderBonus: 5 } },
                    { id: 'ignore', text: '不管他们', effect: { morale: -5, possibleFight: true } }
                ]
            },
            {
                id: 'disease',
                title: '疾病爆发',
                desc: '有居民出现了发烧和咳嗽症状，可能是传染病！',
                type: 'internal',
                choices: [
                    { id: 'quarantine', text: '立即隔离治疗', effect: { medicine: -5, sickResidents: 1 } },
                    { id: 'ignore', text: '可能只是小感冒', effect: { sickResidents: 3, morale: -10 } }
                ]
            },
            {
                id: 'theft',
                title: '物资失窃',
                desc: '早上清点物资时发现少了一些食物，有人偷东西。',
                type: 'internal',
                choices: [
                    { id: 'investigate', text: '展开调查', effect: { morale: -3 } },
                    { id: 'ration', text: '加强配给管理', effect: { morale: -5, theftPrevention: true } },
                    { id: 'ignore', text: '可能是数错了', effect: { food: -5 } }
                ]
            },
            {
                id: 'good_news',
                title: '好消息',
                desc: '今天天气很好，居民们的心情都不错。',
                type: 'internal',
                choices: [
                    { id: 'celebrate', text: '组织一些娱乐活动', effect: { morale: 10, food: -3 } },
                    { id: 'work', text: '趁好天气多干活', effect: { productionBonus: 0.2 } }
                ]
            }
        ]
    },

    difficulties: {
        easy: {
            name: '简单',
            startResources: { food: 80, water: 80, medicine: 30, materials: 50, parts: 15 },
            startResidents: 5,
            eventChance: 0.3,
            disasterChance: 0.1,
            productionMultiplier: 1.2,
            consumptionMultiplier: 0.8
        },
        normal: {
            name: '普通',
            startResources: { food: 50, water: 50, medicine: 20, materials: 30, parts: 10 },
            startResidents: 4,
            eventChance: 0.5,
            disasterChance: 0.2,
            productionMultiplier: 1.0,
            consumptionMultiplier: 1.0
        },
        hard: {
            name: '困难',
            startResources: { food: 30, water: 30, medicine: 10, materials: 20, parts: 5 },
            startResidents: 3,
            eventChance: 0.7,
            disasterChance: 0.35,
            productionMultiplier: 0.8,
            consumptionMultiplier: 1.2
        },
        nightmare: {
            name: '噩梦',
            startResources: { food: 20, water: 20, medicine: 5, materials: 15, parts: 3 },
            startResidents: 2,
            eventChance: 0.9,
            disasterChance: 0.5,
            productionMultiplier: 0.6,
            consumptionMultiplier: 1.5
        }
    },

    achievements: [
        { id: 'survive_7', name: '坚持一周', desc: '生存7天', icon: '📅', condition: { days: 7 } },
        { id: 'survive_30', name: '满月求生', desc: '生存30天', icon: '🌕', condition: { days: 30 } },
        { id: 'survive_100', name: '百日幸存者', desc: '生存100天', icon: '💯', condition: { days: 100 } },
        { id: 'population_10', name: '人丁兴旺', desc: '同时拥有10名居民', icon: '👨‍👩‍👧‍👦', condition: { population: 10 } },
        { id: 'population_20', name: '繁荣社区', desc: '同时拥有20名居民', icon: '🏙️', condition: { population: 20 } },
        { id: 'builder', name: '建设者', desc: '建造10个房间', icon: '🏗️', condition: { roomsBuilt: 10 } },
        { id: 'explorer', name: '探索者', desc: '完成20次探索', icon: '🗺️', condition: { explorations: 20 } },
        { id: 'doctor', name: '妙手回春', desc: '治愈10名病患', icon: '👨‍⚕️', condition: { healed: 10 } },
        { id: 'no_casualty', name: '无人伤亡', desc: '生存30天无一人死亡', icon: '🛡️', condition: { days: 30, deaths: 0 } },
        { id: 'rich', name: '物资充裕', desc: '同时拥有200以上食物', icon: '💰', condition: { food: 200 } },
        { id: 'hard_mode', name: '迎难而上', desc: '在困难难度下生存30天', icon: '💪', condition: { difficulty: 'hard', days: 30 } },
        { id: 'nightmare_survivor', name: '噩梦幸存者', desc: '在噩梦难度下生存10天', icon: '😱', condition: { difficulty: 'nightmare', days: 10 } }
    ],

    endings: [
        { id: 'rescue', name: '获救结局', desc: '救援队终于赶到，你们被安全撤离到了难民营。', condition: { days: 100 } },
        { id: 'extinction', name: '全灭结局', desc: '所有居民都死了，避难楼变成了一座空楼...', condition: { population: 0 } },
        { id: 'prosperity', name: '繁荣结局', desc: '避难楼发展成了一个繁荣的小社区，人们在这里开始了新生活。', condition: { population: 25, days: 60, morale: 80 } },
        { id: 'madness', name: '疯狂结局', desc: '士气降到了冰点，居民们陷入了疯狂，避难楼变成了人间地狱...', condition: { morale: 0 } },
        { id: 'exile', name: '流亡结局', desc: '物资耗尽，你们不得不离开避难楼，踏上未知的旅程...', condition: { food: 0, water: 0 } }
    ]
};
