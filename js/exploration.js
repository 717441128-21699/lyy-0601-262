const ExplorationSystem = {
    currentSelection: null,
    selectedTeam: [],

    getLocations() {
        return GameData.locations;
    },

    selectLocation(locationId) {
        this.currentSelection = locationId;
        this.selectedTeam = [];
    },

    addToTeam(residentId) {
        if (this.selectedTeam.length >= 3) {
            UI.showToast('队伍最多3人', 'warning');
            return false;
        }
        if (this.selectedTeam.includes(residentId)) {
            this.selectedTeam = this.selectedTeam.filter(id => id !== residentId);
            return false;
        }
        this.selectedTeam.push(residentId);
        return true;
    },

    canStartMission() {
        if (!this.currentSelection) return { can: false, reason: '请选择探索地点' };
        if (this.selectedTeam.length === 0) return { can: false, reason: '请选择队员' };
        
        const state = GameState.getState();
        for (const resId of this.selectedTeam) {
            const resident = state.residents.find(r => r.id === resId);
            if (!resident) return { can: false, reason: '居民不存在' };
            if (resident.onMission) return { can: false, reason: `${resident.name}正在执行任务` };
            if (resident.status !== 'healthy') return { can: false, reason: `${resident.name}状态不佳` };
            if (resident.stamina < 30) return { can: false, reason: `${resident.name}体力不足` };
        }
        
        return { can: true, reason: '' };
    },

    startMission() {
        const check = this.canStartMission();
        if (!check.can) {
            UI.showToast(check.reason, 'error');
            return null;
        }

        const state = GameState.getState();
        const location = GameData.locations.find(l => l.id === this.currentSelection);
        
        const team = [];
        for (const resId of this.selectedTeam) {
            const resident = state.residents.find(r => r.id === resId);
            resident.onMission = true;
            resident.stamina -= 30;
            team.push(resId);
        }

        const mission = {
            locationId: this.currentSelection,
            locationName: location.name,
            team: team,
            duration: location.duration,
            daysLeft: location.duration,
            danger: location.danger
        };

        GameState.addMission(mission);
        GameState.addLog(`派遣队伍前往${location.name}探索。`, 'info');
        UI.showToast(`已派遣队伍前往${location.name}`, 'info');
        
        this.currentSelection = null;
        this.selectedTeam = [];
        
        return mission;
    },

    updateMissions() {
        const state = GameState.getState();
        const completedMissions = [];

        for (let i = state.missions.length - 1; i >= 0; i--) {
            const mission = state.missions[i];
            mission.daysLeft--;

            if (mission.daysLeft <= 0) {
                this.completeMission(mission);
                completedMissions.push(mission);
                state.missions.splice(i, 1);
                state.stats.totalExplorations++;
            }
        }

        GameState.checkAchievements();
        return completedMissions;
    },

    completeMission(mission) {
        const state = GameState.getState();
        const location = GameData.locations.find(l => l.id === mission.locationId);
        
        let teamPower = 0;
        let teamScavenge = 0;
        let teamLuck = 0;
        
        mission.team.forEach(resId => {
            const resident = state.residents.find(r => r.id === resId);
            if (resident) {
                resident.onMission = false;
                teamPower += resident.skills.combat;
                teamScavenge += resident.skills.scavenge;
                if (resident.traits.includes('lucky')) teamLuck += 0.2;
                if (resident.traits.includes('scout')) teamScavenge *= 1.3;
                if (resident.traits.includes('strong')) teamPower *= 1.2;
            }
        });

        const dangerRoll = Math.random();
        const danger = mission.danger - teamPower / 300;
        
        if (dangerRoll < danger) {
            const injuredCount = Math.random() < 0.5 ? 1 : (Math.random() < 0.7 ? 2 : 0);
            for (let i = 0; i < injuredCount && i < mission.team.length; i++) {
                const resId = mission.team[Math.floor(Math.random() * mission.team.length)];
                const resident = state.residents.find(r => r.id === resId);
                if (resident) {
                    ResidentSystem.injure(resident, 20 + Math.random() * 30);
                    GameState.addLog(`${resident.name} 在探索中受伤了！`, 'warning');
                }
            }

            if (dangerRoll < danger * 0.3) {
                const deadIdx = Math.floor(Math.random() * mission.team.length);
                const deadId = mission.team[deadIdx];
                const resident = state.residents.find(r => r.id === deadId);
                if (resident) {
                    ResidentSystem.die(resident);
                    GameState.addLog(`${resident.name} 在探索中牺牲了...`, 'danger');
                }
            }
        }

        const loot = {};
        const lootMultiplier = 0.7 + teamScavenge / 200 + teamLuck;
        
        for (const [resource, range] of Object.entries(location.loot)) {
            const min = range[0];
            const max = range[1];
            const amount = Math.floor((min + Math.random() * (max - min)) * lootMultiplier);
            if (amount > 0) {
                loot[resource] = amount;
                GameState.addResource(resource, amount);
            }
        }

        const lootStr = Object.entries(loot)
            .map(([k, v]) => `${this.getResourceName(k)}+${v}`)
            .join(', ');
        
        GameState.addLog(`探索队伍从${location.name}返回，获得：${lootStr || '一无所获'}。`, loot ? 'success' : 'info');
        
        if (location.special === 'survivors' && Math.random() < 0.3) {
            const newResident = ResidentSystem.generateRandomResident();
            GameState.addResident(newResident);
            GameState.addLog(`探索队带回了一名幸存者：${newResident.name}！`, 'success');
            UI.showToast(`发现幸存者：${newResident.name}`, 'success');
        }

        UI.showToast(`探索完成：${location.name}`, 'success');
    },

    getResourceName(type) {
        const names = {
            food: '食物',
            water: '水',
            medicine: '药品',
            materials: '材料',
            parts: '零件',
            bandage: '绷带',
            entertainment: '娱乐品',
            books: '书籍'
        };
        return names[type] || type;
    },

    getActiveMissions() {
        const state = GameState.getState();
        return state.missions;
    },

    getAvailableResidents() {
        const state = GameState.getState();
        return state.residents.filter(r => 
            !r.onMission && 
            r.status === 'healthy' && 
            r.stamina >= 30
        );
    }
};
