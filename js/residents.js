const ResidentSystem = {
    residentIdCounter: 1,

    jobRoomMapping: {
        farmer: ['farm'],
        water_worker: ['water_plant'],
        builder: ['workshop', 'power_room'],
        doctor: ['medical_room'],
        guard: ['guard_post'],
        chef: ['canteen'],
        scientist: ['lab']
    },

    getSuitableRoomsForJob(jobId) {
        return this.jobRoomMapping[jobId] || [];
    },

    isJobRoomMatch(jobId, roomType) {
        const suitable = this.getSuitableRoomsForJob(jobId);
        return suitable.length === 0 || suitable.includes(roomType);
    },

    generateRandomResident() {
        const state = GameState.getState();
        const name = this.generateName();
        const age = Math.floor(Math.random() * 40) + 18;
        const gender = Math.random() > 0.5 ? 'male' : 'female';
        
        const numTraits = Math.floor(Math.random() * 2) + 1;
        const traits = [];
        const availableTraits = [...GameData.traits.filter(t => t.type !== 'negative' || Math.random() > 0.7)];
        for (let i = 0; i < numTraits && availableTraits.length > 0; i++) {
            const idx = Math.floor(Math.random() * availableTraits.length);
            traits.push(availableTraits[idx].id);
            availableTraits.splice(idx, 1);
        }

        return {
            id: 'res_' + (this.residentIdCounter++),
            name: name,
            age: age,
            gender: gender,
            avatar: this.getAvatar(gender, age),
            health: 80 + Math.floor(Math.random() * 20),
            maxHealth: 100,
            hunger: 100,
            thirst: 100,
            morale: 70 + Math.floor(Math.random() * 20),
            stamina: 100,
            traits: traits,
            job: 'idle',
            status: 'healthy',
            sickType: null,
            sickSeverity: null,
            sickDays: 0,
            treatmentProgress: 0,
            quarantined: false,
            hospitalized: false,
            injured: false,
            injurySeverity: 0,
            assignedRoom: null,
            onMission: false,
            daysInShelter: 0,
            skills: {
                combat: Math.floor(Math.random() * 50) + 20,
                medical: Math.floor(Math.random() * 40) + 10,
                build: Math.floor(Math.random() * 50) + 15,
                scavenge: Math.floor(Math.random() * 50) + 20,
                farming: Math.floor(Math.random() * 40) + 10,
                research: Math.floor(Math.random() * 40) + 10
            }
        };
    },

    generateName() {
        const firstNames = GameData.names.firstNames;
        const lastNames = GameData.names.lastNames;
        const first = firstNames[Math.floor(Math.random() * firstNames.length)];
        const last = lastNames[Math.floor(Math.random() * lastNames.length)];
        return first + last;
    },

    getAvatar(gender, age) {
        if (gender === 'male') {
            if (age < 30) return '👨';
            if (age < 50) return '👨‍🦱';
            return '👴';
        } else {
            if (age < 30) return '👩';
            if (age < 50) return '👩‍🦰';
            return '👵';
        }
    },

    getTrait(traitId) {
        return GameData.traits.find(t => t.id === traitId);
    },

    getJob(jobId) {
        return GameData.jobs.find(j => j.id === jobId);
    },

    assignJob(residentId, jobId) {
        const state = GameState.getState();
        const resident = state.residents.find(r => r.id === residentId);
        if (!resident) return false;

        const oldJob = resident.job;
        resident.job = jobId;
        
        if (jobId === 'idle' || jobId === 'scavenger' || jobId === 'guard') {
            if (resident.assignedRoom) {
                resident.assignedRoom = null;
                GameState.addLog(`${resident.name} 的房间分配已取消。`);
            }
        } else if (resident.assignedRoom) {
            const room = BuildingSystem.findRoom(resident.assignedRoom);
            if (room && !this.isJobRoomMatch(jobId, room.type)) {
                const roomData = GameData.rooms.find(r => r.id === room.type);
                resident.assignedRoom = null;
                GameState.addLog(`${resident.name} 的职业变更为${this.getJob(jobId).name}，与${roomData ? roomData.name : '房间'}不匹配，房间分配已自动取消。`, 'warning');
                UI.showToast(`${resident.name} 的房间分配已取消（职业不匹配`, 'info');
            }
        }
        
        GameState.addLog(`${resident.name} 被分配为${this.getJob(jobId).name}。`);
        GameState.save();
        return true;
    },

    getDisease(diseaseId) {
        return GameData.diseases.find(d => d.id === diseaseId);
    },

    getSeverityName(severity) {
        const names = {
            mild: '轻症',
            moderate: '中症',
            severe: '重症',
            critical: '危重症'
        };
        return names[severity] || '未知';
    },

    updateResidentDaily(resident) {
        const state = GameState.getState();
        const diff = GameData.difficulties[state.difficulty];
        
        resident.daysInShelter++;
        
        const foodConsume = 1 * diff.consumptionMultiplier;
        const waterConsume = 1 * diff.consumptionMultiplier;
        
        if (state.policies.ration === 'reduced') {
            resident.hunger -= 15;
            resident.thirst -= 15;
        } else if (state.policies.ration === 'starvation') {
            resident.hunger -= 25;
            resident.thirst -= 25;
        } else {
            resident.hunger -= 10;
            resident.thirst -= 10;
        }

        if (resident.hunger < 30) {
            resident.health -= 2;
            resident.morale -= 3;
        }
        if (resident.thirst < 30) {
            resident.health -= 3;
            resident.morale -= 5;
        }
        if (resident.hunger <= 0 || resident.thirst <= 0) {
            resident.health -= 10;
        }

        if (resident.status === 'sick') {
            resident.sickDays++;
            const disease = this.getDisease(resident.sickType);
            const damage = disease ? disease.damagePerDay : 3;
            resident.health -= damage;
            resident.morale -= 5;
            
            const isInfectious = disease ? disease.infectious : true;
            if (!resident.quarantined && isInfectious && Math.random() < 0.05 && resident.sickDays > 3) {
                this.spreadDisease(resident);
            }
            
            const baseHealDays = disease ? disease.baseHealDays : 7;
            if (resident.treatmentProgress >= 100 || (resident.sickDays > baseHealDays && Math.random() < 0.2)) {
                this.recoverFromSickness(resident);
                if (resident.quarantined) {
                    MedicalSystem.unquarantine(resident.id);
                }
                if (resident.hospitalized) {
                    MedicalSystem.dischargeFromHospital(resident.id);
                }
            }
        }

        if (resident.injured) {
            resident.health -= 2;
            if (resident.injurySeverity > 50) {
                resident.health -= 3;
            }
        }

        let moraleChange = state.morale / 10 - 5;
        
        if (resident.traits.includes('optimistic')) {
            moraleChange += 3;
        }
        if (resident.traits.includes('paranoid')) {
            moraleChange -= 2;
        }
        
        resident.morale = Math.max(0, Math.min(100, resident.morale + moraleChange));

        if (resident.health <= 0) {
            this.die(resident);
        }

        if (resident.stamina < 100) {
            resident.stamina = Math.min(100, resident.stamina + 20);
        }
    },

    spreadDisease(sickResident) {
        const state = GameState.getState();
        const disease = this.getDisease(sickResident.sickType);
        const healthyResidents = state.residents.filter(r => 
            r.status === 'healthy' && !r.onMission && r.id !== sickResident.id && !r.quarantined
        );
        
        if (healthyResidents.length > 0) {
            const target = healthyResidents[Math.floor(Math.random() * healthyResidents.length)];
            this.makeSick(target, sickResident.sickType);
            GameState.addLog(`${target.name} 被${sickResident.name}传染了${disease ? disease.name : '疾病'}！`, 'warning');
        }
    },

    makeSick(residentOrId, type = 'flu') {
        const state = GameState.getState();
        let resident;
        if (typeof residentOrId === 'string') {
            resident = state.residents.find(r => r.id === residentOrId);
        } else {
            resident = residentOrId;
        }
        if (!resident) return false;
        if (!resident.traits) resident.traits = [];

        const disease = this.getDisease(type);
        resident.status = 'sick';
        resident.sickType = type;
        resident.sickSeverity = disease ? disease.severity : 'mild';
        resident.sickDays = 0;
        resident.treatmentProgress = 0;
        resident.hospitalized = false;
        resident.quarantined = false;
        if (resident.traits.includes('sickly')) {
            resident.sickDays = -1;
        }
        if (resident.assignedRoom) {
            resident.assignedRoom = null;
            GameState.addLog(`${resident.name} 生病了，工作分配已取消。`, 'info');
        }
        return true;
    },

    recoverFromSickness(resident) {
        resident.status = 'healthy';
        resident.sickType = null;
        resident.sickSeverity = null;
        resident.sickDays = 0;
        resident.treatmentProgress = 0;
        resident.health = Math.min(resident.maxHealth, resident.health + 20);
        GameState.addLog(`${resident.name} 从疾病中康复了。`, 'success');
    },

    injure(resident, severity = 30) {
        resident.injured = true;
        resident.injurySeverity = severity;
        resident.health -= severity * 0.5;
    },

    healInjury(resident) {
        resident.injured = false;
        resident.injurySeverity = 0;
    },

    die(resident) {
        const state = GameState.getState();
        const sickDeath = resident.status === 'sick';
        if (sickDeath) {
            state.stats.totalSickDeaths = (state.stats.totalSickDeaths || 0) + 1;
        }
        if (resident.quarantined) {
            MedicalSystem.unquarantine(resident.id);
        }
        if (resident.hospitalized) {
            MedicalSystem.dischargeFromHospital(resident.id);
        }
        GameState.removeResident(resident.id, sickDeath ? '病死' : '死亡');
    },

    getResidentEffectiveness(resident, skillType) {
        let effectiveness = 1.0;
        
        if (resident.health < 50) effectiveness *= 0.7;
        if (resident.health < 30) effectiveness *= 0.5;
        if (resident.stamina < 30) effectiveness *= 0.6;
        if (resident.status === 'sick') effectiveness *= 0.4;
        if (resident.injured) effectiveness *= 0.5;
        
        if (resident.traits.includes('hardworking')) effectiveness *= 1.25;
        if (resident.traits.includes('strong') && (skillType === 'combat' || skillType === 'build')) {
            effectiveness *= 1.2;
        }
        if (resident.traits.includes('smart') && (skillType === 'research' || skillType === 'medical')) {
            effectiveness *= 1.3;
        }
        
        if (resident.skills[skillType]) {
            effectiveness *= 0.5 + (resident.skills[skillType] / 100);
        }
        
        return effectiveness;
    },

    getIdleResidents() {
        const state = GameState.getState();
        return state.residents.filter(r => r.job === 'idle' && !r.onMission && r.status === 'healthy');
    },

    getWorkingResidents() {
        const state = GameState.getState();
        return state.residents.filter(r => r.job !== 'idle' && !r.onMission);
    }
};
