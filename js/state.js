const GameState = {
    state: null,
    globalDataKey: 'shelter_global_data',

    getGlobalData() {
        try {
            const data = localStorage.getItem(this.globalDataKey);
            if (data) {
                const parsed = JSON.parse(data);
                if (!parsed.achievements) parsed.achievements = [];
                if (!parsed.unlockedDifficulties) parsed.unlockedDifficulties = ['easy', 'normal', 'hard'];
                if (!parsed.highScores) parsed.highScores = [];
                if (!Array.isArray(parsed.highScores)) {
                    const arr = [];
                    for (const [endingId, score] of Object.entries(parsed.highScores)) {
                        arr.push({ ...score, ending: endingId });
                    }
                    parsed.highScores = arr.sort((a, b) => b.days - a.days);
                }
                return parsed;
            }
        } catch (e) {
            console.error('读取全局数据失败:', e);
        }
        return {
            achievements: [],
            unlockedDifficulties: ['easy', 'normal', 'hard'],
            highScores: []
        };
    },

    saveGlobalData(data) {
        try {
            localStorage.setItem(this.globalDataKey, JSON.stringify(data));
        } catch (e) {
            console.error('保存全局数据失败:', e);
        }
    },

    unlockAchievement(achievementId) {
        const globalData = this.getGlobalData();
        if (!globalData.achievements.includes(achievementId)) {
            globalData.achievements.push(achievementId);
            this.saveGlobalData(globalData);
        }
        
        if (achievementId === 'hard_mode') {
            this.unlockDifficulty('nightmare');
        }
    },

    unlockDifficulty(difficulty) {
        const globalData = this.getGlobalData();
        if (!globalData.unlockedDifficulties.includes(difficulty)) {
            globalData.unlockedDifficulties.push(difficulty);
            this.saveGlobalData(globalData);
            UI.showToast(`难度已解锁：${GameData.difficulties[difficulty].name}`, 'success');
        }
    },

    isDifficultyUnlocked(difficulty) {
        const globalData = this.getGlobalData();
        return globalData.unlockedDifficulties.includes(difficulty);
    },

    updateHighScore(ending, days, population, score, difficulty) {
        const globalData = this.getGlobalData();
        if (!globalData.highScores || !Array.isArray(globalData.highScores)) {
            globalData.highScores = [];
        }

        globalData.highScores.push({
            ending: ending,
            days: days,
            population: population,
            score: score,
            difficulty: difficulty,
            date: new Date().toISOString()
        });

        globalData.highScores.sort((a, b) => b.score - a.score);
        globalData.highScores = globalData.highScores.slice(0, 20);
        this.saveGlobalData(globalData);
        return true;
    },

    getHighScores() {
        const globalData = this.getGlobalData();
        return globalData.highScores || [];
    },

    getBestGame() {
        const highScores = this.getHighScores();
        return highScores.length > 0 ? highScores[0] : null;
    },

    init(difficulty = 'normal') {
        const globalData = this.getGlobalData();
        
        const diff = GameData.difficulties[difficulty];
        this.state = {
            day: 1,
            timeOfDay: 'morning',
            difficulty: difficulty,
            resources: { ...diff.startResources, bandage: 10, entertainment: 3, books: 2 },
            maxResources: {
                food: 200,
                water: 200,
                medicine: 100,
                materials: 150,
                parts: 80,
                bandage: 50,
                entertainment: 30,
                books: 20
            },
            residents: [],
            floors: this.generateInitialFloors(),
            power: {
                working: true,
                level: 1,
                output: 5
            },
            gate: {
                working: true,
                health: 100
            },
            morale: 75,
            policies: {
                curfew: false,
                ration: 'normal',
                foreignPolicy: 'neutral'
            },
            events: {
                pending: [],
                history: []
            },
            missions: [],
            repairQueue: [],
            stats: {
                totalJoined: 0,
                totalDeaths: 0,
                totalExplorations: 0,
                totalRoomsBuilt: 0,
                totalHealed: 0,
                totalProduced: {
                    food: 0,
                    water: 0,
                    materials: 0,
                    parts: 0
                },
                totalConsumed: {
                    food: 0,
                    water: 0,
                    medicine: 0,
                    materials: 0,
                    parts: 0
                },
                totalNormalDeaths: 0,
                totalSickDeaths: 0,
                totalExplorationDeaths: 0,
                totalExplorationGains: {
                    food: 0,
                    water: 0,
                    medicine: 0,
                    materials: 0,
                    parts: 0
                },
                residentContributions: {}
            },
            achievements: [...globalData.achievements],
            gameOver: false,
            ending: null,
            log: []
        };

        for (let i = 0; i < diff.startResidents; i++) {
            this.addResident(ResidentSystem.generateRandomResident());
        }

        this.addLog('第1天开始，欢迎来到末日避难楼。');
        this.save();
        return this.state;
    },

    generateInitialFloors() {
        const floors = [];
        for (let i = 0; i < 6; i++) {
            floors.push({
                number: i + 1,
                name: this.getFloorName(i + 1),
                rooms: [],
                maxRooms: 3
            });
        }
        
        let roomId = 1;
        
        floors[0].rooms.push({
            id: 'room_' + (roomId++),
            type: 'dormitory',
            health: 100,
            assignedWorkers: []
        });
        floors[0].rooms.push({
            id: 'room_' + (roomId++),
            type: 'storage',
            health: 100,
            assignedWorkers: []
        });
        
        floors[1].rooms.push({
            id: 'room_' + (roomId++),
            type: 'farm',
            health: 100,
            assignedWorkers: []
        });
        floors[1].rooms.push({
            id: 'room_' + (roomId++),
            type: 'water_plant',
            health: 100,
            assignedWorkers: []
        });
        
        floors[2].rooms.push({
            id: 'room_' + (roomId++),
            type: 'medical_room',
            health: 100,
            assignedWorkers: []
        });
        floors[2].rooms.push({
            id: 'room_' + (roomId++),
            type: 'canteen',
            health: 100,
            assignedWorkers: []
        });
        
        return floors;
    },

    getFloorName(num) {
        const names = ['地下室', '一楼', '二楼', '三楼', '四楼', '五楼', '六楼', '七楼', '八楼', '九楼', '十楼'];
        return names[num - 1] || `${num}楼`;
    },

    getState() {
        return this.state;
    },

    addResident(resident) {
        this.state.residents.push(resident);
        this.state.stats.totalJoined++;
        this.addLog(`${resident.name} 加入了避难楼。`);
    },

    removeResident(residentId, reason = '离开', deathType = null) {
        const index = this.state.residents.findIndex(r => r.id === residentId);
        if (index !== -1) {
            const resident = this.state.residents[index];
            this.state.residents.splice(index, 1);
            if (reason === '死亡' || reason === '病死' || reason === '牺牲') {
                this.state.stats.totalDeaths++;
                if (deathType === 'sick' || reason === '病死') {
                    this.state.stats.totalSickDeaths = (this.state.stats.totalSickDeaths || 0) + 1;
                } else if (deathType === 'exploration' || reason === '牺牲') {
                    this.state.stats.totalExplorationDeaths = (this.state.stats.totalExplorationDeaths || 0) + 1;
                } else {
                    this.state.stats.totalNormalDeaths = (this.state.stats.totalNormalDeaths || 0) + 1;
                }
            }
            this.addLog(`${resident.name} ${reason}了。`);
        }
    },

    addResource(type, amount) {
        const current = this.state.resources[type] || 0;
        const max = this.state.maxResources[type] || 999;
        this.state.resources[type] = Math.min(current + amount, max);
    },

    removeResource(type, amount) {
        const current = this.state.resources[type] || 0;
        this.state.resources[type] = Math.max(0, current - amount);
        return current >= amount;
    },

    hasResource(type, amount) {
        return (this.state.resources[type] || 0) >= amount;
    },

    addResourceProduced(type, amount) {
        if (!this.state.stats.totalProduced) return;
        this.state.stats.totalProduced[type] = (this.state.stats.totalProduced[type] || 0) + amount;
    },

    addResourceConsumed(type, amount) {
        if (!this.state.stats.totalConsumed) return;
        this.state.stats.totalConsumed[type] = (this.state.stats.totalConsumed[type] || 0) + amount;
    },

    addExplorationGain(type, amount) {
        if (!this.state.stats.totalExplorationGains) return;
        this.state.stats.totalExplorationGains[type] = (this.state.stats.totalExplorationGains[type] || 0) + amount;
    },

    addResidentContribution(residentId, type, amount) {
        if (!this.state.stats.residentContributions) return;
        if (!this.state.stats.residentContributions[residentId]) {
            this.state.stats.residentContributions[residentId] = { repairs: 0, production: 0, explorations: 0 };
        }
        this.state.stats.residentContributions[residentId][type] = (this.state.stats.residentContributions[residentId][type] || 0) + amount;
    },

    addMorale(amount) {
        this.state.morale = Math.max(0, Math.min(100, this.state.morale + amount));
    },

    addEvent(event) {
        event.id = 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        event.day = this.state.day;
        this.state.events.pending.push(event);
        this.updateEventBadge();
    },

    resolveEvent(eventId, choiceIndex) {
        const eventIndex = this.state.events.pending.findIndex(e => e.id === eventId);
        if (eventIndex === -1) return null;

        const event = this.state.events.pending[eventIndex];
        const choice = event.choices[choiceIndex];
        
        this.state.events.pending.splice(eventIndex, 1);
        this.state.events.history.push({
            ...event,
            chosenChoice: choiceIndex,
            resolvedDay: this.state.day
        });

        this.addLog(`事件「${event.title}」：${choice.text}`);
        this.updateEventBadge();
        
        return choice;
    },

    updateEventBadge() {
        const badge = document.getElementById('event-badge');
        if (badge) {
            if (this.state.events.pending.length > 0) {
                badge.classList.remove('hidden');
                badge.textContent = this.state.events.pending.length;
            } else {
                badge.classList.add('hidden');
            }
        }
    },

    addMission(mission) {
        mission.id = 'mission_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        mission.startDay = this.state.day;
        mission.status = 'active';
        this.state.missions.push(mission);
    },

    addLog(message, type = 'info') {
        this.state.log.unshift({
            day: this.state.day,
            message,
            type,
            time: Date.now()
        });
        if (this.state.log.length > 200) {
            this.state.log.pop();
        }
    },

    checkAchievements() {
        const stats = this.state.stats;
        const state = this.state;
        
        GameData.achievements.forEach(achievement => {
            if (state.achievements.includes(achievement.id)) return;
            
            let unlocked = true;
            const cond = achievement.condition;
            
            if (cond.days && state.day < cond.days) unlocked = false;
            if (cond.population && state.residents.length < cond.population) unlocked = false;
            if (cond.roomsBuilt && stats.totalRoomsBuilt < cond.roomsBuilt) unlocked = false;
            if (cond.explorations && stats.totalExplorations < cond.explorations) unlocked = false;
            if (cond.healed && stats.totalHealed < cond.healed) unlocked = false;
            if (cond.deaths !== undefined && stats.totalDeaths > cond.deaths) unlocked = false;
            if (cond.food && state.resources.food < cond.food) unlocked = false;
            if (cond.difficulty && state.difficulty !== cond.difficulty) unlocked = false;
            
            if (unlocked) {
                this.unlockAchievement(achievement.id);
                state.achievements.push(achievement.id);
                this.addLog(`🏆 成就解锁：${achievement.name}！`, 'success');
                UI.showToast(`成就解锁：${achievement.name}`, 'success');
            }
        });
    },

    checkEndings() {
        const state = this.state;
        if (state.gameOver) return;

        for (const ending of GameData.endings) {
            let triggered = true;
            const cond = ending.condition;

            if (cond.days && state.day < cond.days) triggered = false;
            if (cond.population !== undefined && state.residents.length !== cond.population) {
                if (cond.population === 0 && state.residents.length > 0) triggered = false;
                if (cond.population > 0 && state.residents.length < cond.population) triggered = false;
            }
            if (cond.morale !== undefined && state.morale > cond.morale) triggered = false;
            if (cond.food !== undefined && cond.water !== undefined) {
                if (state.resources.food > 0 || state.resources.water > 0) triggered = false;
            }

            if (triggered) {
                state.gameOver = true;
                state.ending = ending.id;
                this.addLog(`游戏结束：${ending.name}`, 'warning');
                return ending;
            }
        }
        return null;
    },

    save() {
        try {
            localStorage.setItem('shelter_save', JSON.stringify(this.state));
        } catch (e) {
            console.error('保存失败:', e);
        }
    },

    load() {
        try {
            const saved = localStorage.getItem('shelter_save');
            if (saved) {
                this.state = JSON.parse(saved);
                this.migrateState(this.state);
                return true;
            }
        } catch (e) {
            console.error('加载失败:', e);
        }
        return false;
    },

    migrateState(state) {
        if (!state.repairQueue) state.repairQueue = [];
        if (!state.missions) state.missions = [];
        if (!state.log) state.log = [];
        if (!state.achievements) state.achievements = [];
        if (typeof state.gameOver === 'undefined') state.gameOver = false;
        if (!state.ending) state.ending = null;
        if (!state.policies) state.policies = { curfew: false, ration: 'normal', foreignPolicy: 'neutral' };
        if (!state.events) state.events = { pending: [], history: [] };
        if (!state.power) state.power = { working: true, level: 1, output: 5 };
        if (!state.gate) state.gate = { working: true, health: 100 };
        if (!state.morale) state.morale = 75;

        if (!state.stats) state.stats = {};
        const s = state.stats;
        if (!s.totalJoined) s.totalJoined = 0;
        if (!s.totalDeaths) s.totalDeaths = 0;
        if (!s.totalExplorations) s.totalExplorations = 0;
        if (!s.totalRoomsBuilt) s.totalRoomsBuilt = 0;
        if (!s.totalHealed) s.totalHealed = 0;
        if (!s.totalNormalDeaths) s.totalNormalDeaths = 0;
        if (!s.totalSickDeaths) s.totalSickDeaths = 0;
        if (!s.totalExplorationDeaths) s.totalExplorationDeaths = 0;
        if (!s.totalProduced) s.totalProduced = { food: 0, water: 0, materials: 0, parts: 0 };
        if (!s.totalConsumed) s.totalConsumed = { food: 0, water: 0, medicine: 0, materials: 0, parts: 0 };
        if (!s.totalExplorationGains) s.totalExplorationGains = { food: 0, water: 0, medicine: 0, materials: 0, parts: 0 };
        if (!s.residentContributions) s.residentContributions = {};

        state.residents.forEach(r => {
            if (!r.traits) r.traits = [];
            if (!r.skills) r.skills = { combat: 30, medical: 20, build: 30, scavenge: 30, farming: 20, research: 20 };
            if (typeof r.sickSeverity === 'undefined') r.sickSeverity = 'mild';
            if (typeof r.treatmentProgress === 'undefined') r.treatmentProgress = 0;
            if (typeof r.quarantined === 'undefined') r.quarantined = false;
            if (typeof r.hospitalized === 'undefined') r.hospitalized = false;
            if (typeof r.injurySeverity === 'undefined') r.injurySeverity = r.injured ? 30 : 0;
            if (typeof r.injured === 'undefined') r.injured = false;
            if (typeof r.onMission === 'undefined') r.onMission = false;
            if (typeof r.assignedRoom === 'undefined') r.assignedRoom = null;
            if (typeof r.daysInShelter === 'undefined') r.daysInShelter = 0;
            if (typeof r.stamina === 'undefined') r.stamina = 100;
            if (typeof r.shift === 'undefined') r.shift = 'none';
        });
    },

    reset() {
        this.state = null;
        localStorage.removeItem('shelter_save');
    }
};
