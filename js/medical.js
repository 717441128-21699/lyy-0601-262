const MedicalSystem = {
    getPatients() {
        const state = GameState.getState();
        return state.residents.filter(r => r.status === 'sick' || r.injured);
    },

    getSickResidents() {
        const state = GameState.getState();
        return state.residents.filter(r => r.status === 'sick');
    },

    getInjuredResidents() {
        const state = GameState.getState();
        return state.residents.filter(r => r.injured);
    },

    getQuarantined() {
        const state = GameState.getState();
        return state.residents.filter(r => r.quarantined);
    },

    getDoctors() {
        const state = GameState.getState();
        return state.residents.filter(r => r.job === 'doctor' && r.status === 'healthy' && !r.onMission);
    },

    treatSick(residentId) {
        const state = GameState.getState();
        const resident = state.residents.find(r => r.id === residentId);
        
        if (!resident) return false;
        if (resident.status !== 'sick') {
            UI.showToast('该居民没有生病', 'info');
            return false;
        }
        
        if (!GameState.hasResource('medicine', 2)) {
            UI.showToast('药品不足', 'error');
            return false;
        }

        const doctors = this.getDoctors();
        let healChance = 0.4;
        
        if (doctors.length > 0) {
            healChance += doctors.length * 0.15;
            const hasMedic = doctors.some(d => d.traits.includes('medical'));
            if (hasMedic) healChance += 0.2;
        }

        const medRooms = ResourceSystem.countRoomsByType('medical_room');
        if (medRooms > 0) healChance += 0.15;

        GameState.removeResource('medicine', 2);

        if (Math.random() < healChance) {
            ResidentSystem.recoverFromSickness(resident);
            state.stats.totalHealed++;
            GameState.checkAchievements();
            GameState.addLog(`${resident.name} 治疗后痊愈了。`, 'success');
            UI.showToast(`${resident.name} 痊愈了！`, 'success');
            GameState.save();
            return true;
        } else {
            resident.sickDays = Math.max(0, resident.sickDays - 2);
            GameState.addLog(`${resident.name} 接受了治疗，病情有所好转。`, 'info');
            UI.showToast('治疗有效果，但还需要继续治疗', 'info');
            GameState.save();
            return false;
        }
    },

    treatInjury(residentId) {
        const state = GameState.getState();
        const resident = state.residents.find(r => r.id === residentId);
        
        if (!resident) return false;
        if (!resident.injured) {
            UI.showToast('该居民没有受伤', 'info');
            return false;
        }

        const needBandage = resident.injurySeverity > 30;
        const needMedicine = resident.injurySeverity > 50;

        if (needBandage && !GameState.hasResource('bandage', 2)) {
            UI.showToast('绷带不足', 'error');
            return false;
        }
        if (needMedicine && !GameState.hasResource('medicine', 1)) {
            UI.showToast('药品不足', 'error');
            return false;
        }

        if (needBandage) GameState.removeResource('bandage', 2);
        if (needMedicine) GameState.removeResource('medicine', 1);

        const doctors = this.getDoctors();
        let healAmount = 20;
        
        if (doctors.length > 0) {
            healAmount += doctors.length * 8;
            const hasMedic = doctors.some(d => d.traits.includes('medical'));
            if (hasMedic) healAmount *= 1.5;
        }

        const medRooms = ResourceSystem.countRoomsByType('medical_room');
        if (medRooms > 0) healAmount += 10;

        resident.injurySeverity = Math.max(0, resident.injurySeverity - healAmount);
        
        if (resident.injurySeverity <= 0) {
            ResidentSystem.healInjury(resident);
            state.stats.totalHealed++;
            GameState.checkAchievements();
            GameState.addLog(`${resident.name} 的伤好了！`, 'success');
            UI.showToast(`${resident.name} 的伤好了！`, 'success');
        } else {
            GameState.addLog(`${resident.name} 接受了治疗，伤势有所好转。`, 'info');
            UI.showToast('伤势有所好转', 'info');
        }

        GameState.save();
        return true;
    },

    quarantine(residentId) {
        const state = GameState.getState();
        const resident = state.residents.find(r => r.id === residentId);
        
        if (!resident) return false;
        
        if (resident.quarantined) {
            UI.showToast('该居民已在隔离中', 'info');
            return false;
        }

        const quarantineBeds = ResourceSystem.getQuarantineBeds();
        const quarantined = this.getQuarantined();
        
        if (quarantined.length >= quarantineBeds) {
            UI.showToast('隔离区床位不足，请先建造更多隔离区', 'error');
            return false;
        }

        resident.quarantined = true;
        if (resident.assignedRoom) {
            resident.assignedRoom = null;
        }
        GameState.addLog(`${resident.name} 被送进隔离区。`, 'warning');
        UI.showToast(`${resident.name} 已送入隔离区`, 'info');
        return true;
    },

    unquarantine(residentId) {
        const state = GameState.getState();
        const resident = state.residents.find(r => r.id === residentId);
        
        if (!resident) return false;
        
        if (!resident.quarantined) {
            UI.showToast('该居民不在隔离中', 'info');
            return false;
        }

        resident.quarantined = false;
        GameState.addLog(`${resident.name} 解除隔离。`, 'info');
        UI.showToast(`${resident.name} 已解除隔离`, 'info');
        return true;
    },

    dailyUpdate() {
        const state = GameState.getState();
        const doctors = this.getDoctors();
        
        state.residents.forEach(resident => {
            if (resident.injured && resident.injurySeverity > 0) {
                let naturalHeal = 2;
                if (doctors.length > 0) naturalHeal += 3;
                if (resident.traits.includes('strong')) naturalHeal *= 1.5;
                
                resident.injurySeverity = Math.max(0, resident.injurySeverity - naturalHeal);
                if (resident.injurySeverity <= 0) {
                    ResidentSystem.healInjury(resident);
                }
            }
        });

        if (Math.random() < 0.05) {
            this.randomDiseaseOutbreak();
        }
    },

    randomDiseaseOutbreak() {
        const state = GameState.getState();
        const healthyResidents = state.residents.filter(r => 
            r.status === 'healthy' && !r.onMission && !r.quarantined
        );

        if (healthyResidents.length === 0) return;

        const target = healthyResidents[Math.floor(Math.random() * healthyResidents.length)];
        
        let diseaseChance = 0.08;
        if (target.traits.includes('sickly')) diseaseChance *= 1.5;
        if (ResourceSystem.countRoomsByType('medical_room') > 0) diseaseChance *= 0.6;

        if (Math.random() < diseaseChance) {
            ResidentSystem.makeSick(target);
            GameState.addLog(`${target.name} 生病了！`, 'warning');
            UI.showToast(`${target.name} 生病了`, 'warning');
        }
    },

    upgradeMedical() {
        const state = GameState.getState();
        if (!GameState.hasResource('materials', 30) || !GameState.hasResource('parts', 10)) {
            UI.showToast('材料不足', 'error');
            return false;
        }

        GameState.removeResource('materials', 30);
        GameState.removeResource('parts', 10);
        
        GameState.addLog('医疗设施升级了！', 'success');
        UI.showToast('医疗设施升级成功', 'success');
        return true;
    }
};
