const GameState = {
    state: null,
    globalDataKey: 'shelter_global_data',

    getGlobalData() {
        try {
            const data = localStorage.getItem(this.globalDataKey);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('读取全局数据失败:', e);
        }
        return {
            achievements: [],
            unlockedDifficulties: ['easy', 'normal', 'hard'],
            highScores: {}
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
            stats: {
                totalJoined: 0,
                totalDeaths: 0,
                totalExplorations: 0,
                totalRoomsBuilt: 0,
                totalHealed: 0
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

    removeResident(residentId, reason = '离开') {
        const index = this.state.residents.findIndex(r => r.id === residentId);
        if (index !== -1) {
            const resident = this.state.residents[index];
            this.state.residents.splice(index, 1);
            if (reason === '死亡') {
                this.state.stats.totalDeaths++;
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
                return true;
            }
        } catch (e) {
            console.error('加载失败:', e);
        }
        return false;
    },

    reset() {
        this.state = null;
        localStorage.removeItem('shelter_save');
    }
};
