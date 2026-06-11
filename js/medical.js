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

    getHospitalized() {
        const state = GameState.getState();
        return state.residents.filter(r => r.hospitalized);
    },

    getDoctors() {
        const state = GameState.getState();
        return state.residents.filter(r => r.job === 'doctor' && r.status === 'healthy' && !r.onMission);
    },

    getMedicalBedsUsed() {
        return this.getHospitalized().length;
    },

    getQuarantineBedsUsed() {
        return this.getQuarantined().length;
    },

    hospitalize(residentId) {
        const state = GameState.getState();
        const resident = state.residents.find(r => r.id === residentId);
        
        if (!resident) return false;
        if (resident.hospitalized) {
            UI.showToast('该居民已在医疗室', 'info');
            return false;
        }
        if (resident.status !== 'sick' && !resident.injured) {
            UI.showToast('该居民不需要住院', 'info');
            return false;
        }

        const medBeds = ResourceSystem.getMedicalBeds();
        const hospitalized = this.getHospitalized();
        
        if (hospitalized.length >= medBeds) {
            UI.showToast('医疗室床位不足，请先建造更多医疗室', 'error');
            return false;
        }

        resident.hospitalized = true;
        if (resident.assignedRoom) {
            resident.assignedRoom = null;
            GameState.addLog(`${resident.name} 的房间分配已取消（住院）。`, 'info');
        }
        GameState.addLog(`${resident.name} 被送入医疗室治疗。`, 'info');
        UI.showToast(`${resident.name} 已送入医疗室`, 'info');
        GameState.save();
        return true;
    },

    dischargeFromHospital(residentId) {
        const state = GameState.getState();
        const resident = state.residents.find(r => r.id === residentId);
        
        if (!resident) return false;
        if (!resident.hospitalized) {
            UI.showToast('该居民不在医疗室', 'info');
            return false;
        }

        resident.hospitalized = false;
        GameState.addLog(`${resident.name} 离开医疗室。`, 'info');
        UI.showToast(`${resident.name} 已离开医疗室`, 'info');
        GameState.save();
        return true;
    },

    treatSick(residentId) {
        const state = GameState.getState();
        const resident = state.residents.find(r => r.id === residentId);
        
        if (!resident) return false;
        if (resident.status !== 'sick') {
            UI.showToast('该居民没有生病', 'info');
            return false;
        }

        const medicineCost = resident.sickSeverity === 'critical' ? 5 : 
                            resident.sickSeverity === 'severe' ? 3 : 2;
        
        if (!GameState.hasResource('medicine', medicineCost)) {
            UI.showToast(`药品不足！需要${medicineCost}药品`, 'error');
            return false;
        }

        const doctors = this.getDoctors();
        let healProgress = 20;
        
        if (doctors.length > 0) {
            healProgress += doctors.length * 10;
            const hasMedic = doctors.some(d => d.traits.includes('medical'));
            if (hasMedic) healProgress += 15;
        }

        if (resident.hospitalized) healProgress += 15;
        const medRooms = ResourceSystem.countRoomsByType('medical_room');
        if (medRooms > 0) healProgress += 10;

        const disease = ResidentSystem.getDisease(resident.sickType);
        if (disease) {
            const severityMultiplier = { mild: 1.5, moderate: 1, severe: 0.7, critical: 0.5 };
            healProgress *= severityMultiplier[disease.severity] || 1;
        }

        GameState.removeResource('medicine', medicineCost);
        GameState.addResourceConsumed('medicine', medicineCost);

        resident.treatmentProgress = Math.min(100, resident.treatmentProgress + healProgress);

        if (resident.treatmentProgress >= 100) {
            ResidentSystem.recoverFromSickness(resident);
            state.stats.totalHealed++;
            GameState.checkAchievements();
            if (resident.quarantined) {
                this.unquarantine(resident.id);
            }
            if (resident.hospitalized) {
                this.dischargeFromHospital(resident.id);
            }
            GameState.addLog(`${resident.name} 治疗后痊愈了！（治疗进度: 100%）`, 'success');
            UI.showToast(`${resident.name} 痊愈了！`, 'success');
            GameState.save();
            return true;
        } else {
            GameState.addLog(`${resident.name} 接受了治疗（治疗进度: ${Math.floor(resident.treatmentProgress)}%）。`, 'info');
            UI.showToast(`治疗进度: ${Math.floor(resident.treatmentProgress)}%`, 'info');
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

        if (needBandage) {
            GameState.removeResource('bandage', 2);
            GameState.addResourceConsumed('bandage', 2);
        }
        if (needMedicine) {
            GameState.removeResource('medicine', 1);
            GameState.addResourceConsumed('medicine', 1);
        }

        const doctors = this.getDoctors();
        let healAmount = 20;
        
        if (doctors.length > 0) {
            healAmount += doctors.length * 8;
            const hasMedic = doctors.some(d => d.traits.includes('medical'));
            if (hasMedic) healAmount *= 1.5;
        }

        if (resident.hospitalized) healAmount += 10;
        const medRooms = ResourceSystem.countRoomsByType('medical_room');
        if (medRooms > 0) healAmount += 10;

        resident.injurySeverity = Math.max(0, resident.injurySeverity - healAmount);
        
        if (resident.injurySeverity <= 0) {
            ResidentSystem.healInjury(resident);
            state.stats.totalHealed++;
            GameState.checkAchievements();
            if (resident.hospitalized) {
                this.dischargeFromHospital(resident.id);
            }
            GameState.addLog(`${resident.name} 的伤好了！`, 'success');
            UI.showToast(`${resident.name} 的伤好了！`, 'success');
        } else {
            GameState.addLog(`${resident.name} 接受了治疗，伤势: ${Math.floor(resident.injurySeverity)}%。`, 'info');
            UI.showToast(`伤势: ${Math.floor(resident.injurySeverity)}%，正在恢复`, 'info');
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
            GameState.addLog(`${resident.name} 的房间分配已取消（隔离）。`, 'info');
        }
        const disease = ResidentSystem.getDisease(resident.sickType);
        const severityText = disease ? `（${ResidentSystem.getSeverityName(disease.severity)}${disease.infectious ? '，传染性' : ''}）` : '';
        GameState.addLog(`${resident.name} 被送进隔离区${severityText}。`, 'warning');
        UI.showToast(`${resident.name} 已送入隔离区`, 'info');
        GameState.save();
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
        GameState.save();
        return true;
    },

    dailyUpdate() {
        const state = GameState.getState();
        const doctors = this.getDoctors();
        
        state.residents.forEach(resident => {
            if (resident.injured && resident.injurySeverity > 0) {
                let naturalHeal = 2;
                if (doctors.length > 0) naturalHeal += 3;
                if (resident.hospitalized) naturalHeal += 5;
                if (resident.traits.includes('strong')) naturalHeal *= 1.5;
                
                resident.injurySeverity = Math.max(0, resident.injurySeverity - naturalHeal);
                if (resident.injurySeverity <= 0) {
                    ResidentSystem.healInjury(resident);
                    if (resident.hospitalized) {
                        this.dischargeFromHospital(resident.id);
                    }
                }
            }

            if (resident.status === 'sick' && resident.hospitalized && doctors.length > 0) {
                const passiveHeal = 5 + doctors.length * 3;
                resident.treatmentProgress = Math.min(100, resident.treatmentProgress + passiveHeal);
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
            const diseasePool = ['flu', 'flu', 'flu', 'infection', 'infection', 'pneumonia'];
            const sickType = diseasePool[Math.floor(Math.random() * diseasePool.length)];
            ResidentSystem.makeSick(target, sickType);
            const disease = ResidentSystem.getDisease(sickType);
            const severityText = disease ? `（${ResidentSystem.getSeverityName(disease.severity)}）` : '';
            GameState.addLog(`${target.name} 生病了${severityText}！`, 'warning');
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
        GameState.addResourceConsumed('materials', 30);
        GameState.addResourceConsumed('parts', 10);
        
        GameState.addLog('医疗设施升级了！', 'success');
        UI.showToast('医疗设施升级成功', 'success');
        GameState.save();
        return true;
    }
};
