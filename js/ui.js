const UI = {
    currentView: 'overview',
    residentFilter: 'all',

    init() {
        this.bindEvents();
        this.renderAll();
    },

    bindEvents() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchView(btn.dataset.view);
            });
        });

        document.getElementById('btn-next-day').addEventListener('click', () => {
            Game.advanceDay();
        });

        document.getElementById('btn-log').addEventListener('click', () => {
            this.showLogModal();
        });

        document.getElementById('modal-close').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') {
                this.hideModal();
            }
        });

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.residentFilter = btn.dataset.filter;
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderResidents();
            });
        });

        document.querySelectorAll('.btn-repair').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.repair;
                if (type === 'power') {
                    if (!GameState.getState().systems.power.broken) {
                        this.showToast('电力系统运作正常，无需维修', 'info');
                        return;
                    }
                    this.createRepairTaskForSystem('power');
                } else if (type === 'gate') {
                    if (!GameState.getState().systems.gate.broken) {
                        this.showToast('门禁系统运作正常，无需维修', 'info');
                        return;
                    }
                    this.createRepairTaskForSystem('gate');
                }
            });
        });

        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('locked')) {
                    this.showToast('该难度尚未解锁', 'warning');
                    return;
                }
                this.showConfirmModal(
                    '切换难度',
                    '切换难度将重新开始游戏，确定吗？',
                    () => {
                        Game.restart(btn.dataset.diff);
                    }
                );
            });
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            this.showConfirmModal(
                '重新开始',
                '确定要重新开始游戏吗？所有进度将丢失。',
                () => {
                    Game.restart();
                }
            );
        });
    },

    switchView(viewName) {
        this.currentView = viewName;
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        
        const view = document.getElementById('view-' + viewName);
        if (view) {
            view.classList.add('active');
        }

        this.renderView(viewName);
    },

    renderView(viewName) {
        switch (viewName) {
            case 'overview':
                this.renderOverview();
                break;
            case 'residents':
                this.renderResidents();
                break;
            case 'warehouse':
                this.renderWarehouse();
                break;
            case 'exploration':
                this.renderExploration();
                break;
            case 'building':
                this.renderBuilding();
                break;
            case 'medical':
                this.renderMedical();
                break;
            case 'events':
                this.renderEvents();
                break;
            case 'stats':
                this.renderStats();
                break;
        }
    },

    renderAll() {
        this.updateTopBar();
        this.renderView(this.currentView);
    },

    updateTopBar() {
        const state = GameState.getState();
        if (!state) return;

        document.getElementById('day-display').textContent = `第 ${state.day} 天`;
        document.getElementById('time-display').textContent = this.getTimeOfDayText(state.timeOfDay);
        
        document.getElementById('res-food').textContent = Math.floor(state.resources.food);
        document.getElementById('res-water').textContent = Math.floor(state.resources.water);
        document.getElementById('res-medicine').textContent = Math.floor(state.resources.medicine);
        document.getElementById('res-materials').textContent = Math.floor(state.resources.materials);
        document.getElementById('res-morale').textContent = Math.floor(state.morale);
    },

    getTimeOfDayText(time) {
        const texts = {
            morning: '早上',
            afternoon: '下午',
            evening: '傍晚',
            night: '夜晚'
        };
        return texts[time] || time;
    },

    renderOverview() {
        const state = GameState.getState();
        const buildingVisual = document.getElementById('building-visual');
        
        let html = '<div class="building-floors">';
        state.floors.forEach(floor => {
            html += `<div class="floor-row">
                <div class="floor-label">${floor.name}</div>
                <div class="floor-rooms">`;
            
            for (let i = 0; i < floor.maxRooms; i++) {
                const room = floor.rooms[i];
                if (room) {
                    const roomData = GameData.rooms.find(r => r.id === room.type);
                    const healthClass = room.health < 30 ? 'damaged' : '';
                    html += `<div class="room-slot built ${healthClass}" title="${roomData.name} (${room.health}%)" onclick="UI.showRoomDetail('${room.id}')">
                        ${roomData.icon}
                    </div>`;
                } else {
                    html += `<div class="room-slot" title="空地" onclick="UI.showBuildMenu(${floor.number})">
                        +
                    </div>`;
                }
            }
            
            html += '</div></div>';
        });
        html += '</div>';
        
        buildingVisual.innerHTML = html;

        const residents = state.residents;
        document.getElementById('stat-population').textContent = residents.length;
        document.getElementById('stat-healthy').textContent = residents.filter(r => r.status === 'healthy' && !r.injured).length;
        document.getElementById('stat-sick').textContent = residents.filter(r => r.status === 'sick').length;
        document.getElementById('stat-injured').textContent = residents.filter(r => r.injured).length;

        const powerStat = document.getElementById('stat-power');
        const gateStat = document.getElementById('stat-gate');
        powerStat.textContent = state.power.working ? '正常 ✓' : '故障 ⚠';
        powerStat.style.color = state.power.working ? 'var(--success)' : 'var(--danger)';
        powerStat.style.fontWeight = 'bold';
        powerStat.title = state.power.working ? '电力系统运作正常' : '⚠ 电力故障！资源产出为0，士气-5/天';
        
        gateStat.textContent = state.gate.working ? '正常 ✓' : `故障 (${state.gate.health}%) ⚠`;
        gateStat.style.color = state.gate.working ? 'var(--success)' : 'var(--danger)';
        gateStat.style.fontWeight = 'bold';
        gateStat.title = state.gate.working ? '门禁系统运作正常' : '⚠ 门禁损坏！防御下降，陌生人易入侵，士气-3/天';
        
        let totalRooms = 0;
        state.floors.forEach(f => totalRooms += f.rooms.length);
        document.getElementById('stat-rooms').textContent = totalRooms;
        document.getElementById('stat-beds').textContent = ResourceSystem.getTotalBeds();

        const consumption = ResourceSystem.getDailyConsumption();
        document.getElementById('stat-food-use').textContent = consumption.food;
        document.getElementById('stat-water-use').textContent = consumption.water;
        
        const daysLeft = ResourceSystem.getDaysLeft();
        document.getElementById('stat-days-left').textContent = daysLeft === Infinity ? '充足' : daysLeft;

        document.getElementById('stat-curfew').textContent = state.policies.curfew ? '已开启' : '未开启';
        const rationSelect = document.getElementById('stat-ration-select');
        if (rationSelect) rationSelect.value = state.policies.ration;
        const foreignSelect = document.getElementById('stat-foreign-select');
        if (foreignSelect) foreignSelect.value = state.policies.foreignPolicy;
    },

    getRationText(ration) {
        const texts = {
            normal: '正常',
            reduced: '减配',
            starvation: '最低'
        };
        return texts[ration] || ration;
    },

    getForeignPolicyText(policy) {
        const texts = {
            friendly: '友好',
            neutral: '中立',
            hostile: '敌对'
        };
        return texts[policy] || policy;
    },

    renderResidents() {
        const state = GameState.getState();
        const container = document.getElementById('residents-list');
        
        let residents = [...state.residents];
        
        switch (this.residentFilter) {
            case 'healthy':
                residents = residents.filter(r => r.status === 'healthy' && !r.injured);
                break;
            case 'sick':
                residents = residents.filter(r => r.status === 'sick' || r.injured);
                break;
            case 'working':
                residents = residents.filter(r => r.job !== 'idle');
                break;
            case 'idle':
                residents = residents.filter(r => r.job === 'idle');
                break;
        }

        let html = '';
        
        const shiftSummary = ResidentSystem.getShiftSummary();
        const shiftGroups = [
            { key: 'doctor', name: '👨‍⚕️ 医生组', jobs: ['doctor'] },
            { key: 'guard', name: '🛡️ 守卫组', jobs: ['guard'] },
            { key: 'builder', name: '🔨 维修组', jobs: ['builder'] }
        ];
        
        html += `
            <div style="background: var(--bg-card); padding: 15px; border-radius: 8px; margin-bottom: 20px; grid-column: 1 / -1;">
                <h3 style="margin-bottom: 15px; color: var(--primary); font-size: 14px;">📅 批量排班管理</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
        `;
        
        shiftGroups.forEach(group => {
            const summary = shiftSummary[group.key];
            const total = summary.morning.length + summary.night.length + summary.none.length;
            html += `
                <div style="background: var(--bg-dark); padding: 12px; border-radius: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong>${group.name}</strong>
                        <span style="font-size: 12px; color: var(--text-muted);">共${total}人</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 10px; line-height: 1.6;">
                        ☀️ 早班: ${summary.morning.map(r => r.avatar).join('') || '无'} (${summary.morning.length}人)<br>
                        🌙 夜班: ${summary.night.map(r => r.avatar).join('') || '无'} (${summary.night.length}人)<br>
                        🌓 无固定: ${summary.none.map(r => r.avatar).join('') || '无'} (${summary.none.length}人)
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; flex: 1;"
                                onclick="UI.batchShift('${group.jobs.join(',')}', 'morning')">
                            ☀️ 全员早班
                        </button>
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; flex: 1;"
                                onclick="UI.batchShift('${group.jobs.join(',')}', 'night')">
                            🌙 全员夜班
                        </button>
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; flex: 1;"
                                onclick="UI.batchShift('${group.jobs.join(',')}', 'none')">
                            🌓 重置
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;

        residents.forEach(resident => {
            const job = ResidentSystem.getJob(resident.job);
            const statusClass = resident.status === 'sick' ? 'sick' : (resident.injured ? 'injured' : '');
            
            html += `<div class="resident-card ${statusClass}" onclick="UI.showResidentDetail('${resident.id}')">
                <div class="resident-header">
                    <div class="resident-avatar">${resident.avatar}</div>
                    <div>
                        <div class="resident-name">${resident.name}</div>
                        <div class="resident-job">${job ? job.icon + ' ' + job.name : '空闲'} ${ResidentSystem.getShift(resident.shift).icon}</div>
                    </div>
                </div>
                <div class="resident-stats">
                    <div class="stat-bar" title="生命值">
                        <div class="stat-bar-fill ${resident.health < 30 ? 'critical' : (resident.health < 60 ? 'low' : '')}" 
                             style="width: ${resident.health}%"></div>
                    </div>
                    <div class="stat-bar" title="士气">
                        <div class="stat-bar-fill ${resident.morale < 30 ? 'critical' : (resident.morale < 60 ? 'low' : '')}" 
                             style="width: ${resident.morale}%; background: var(--info);"></div>
                    </div>
                </div>
                <div class="resident-traits">
                    ${resident.traits.slice(0, 3).map(t => {
                        const trait = ResidentSystem.getTrait(t);
                        return `<span class="trait-tag">${trait ? trait.name : t}</span>`;
                    }).join('')}
                </div>
            </div>`;
        });

        if (residents.length === 0) {
            html = '<p class="hint">没有符合条件的居民</p>';
        }

        container.innerHTML = html;
    },

    showResidentDetail(residentId) {
        const state = GameState.getState();
        const resident = state.residents.find(r => r.id === residentId);
        if (!resident) return;

        const detailPanel = document.getElementById('resident-detail');
        const job = ResidentSystem.getJob(resident.job);
        
        let assignedRoom = null;
        if (resident.assignedRoom) {
            assignedRoom = BuildingSystem.findRoom(resident.assignedRoom);
        }

        let html = `
            <h3>${resident.avatar} ${resident.name}</h3>
            <p>年龄: ${resident.age}岁</p>
            <p>状态: ${this.getStatusText(resident)}</p>
            <br>
            <h4>属性</h4>
            <p>生命值: ${resident.health}/${resident.maxHealth}</p>
            <p>饱食度: ${resident.hunger}%</p>
            <p>口渴度: ${resident.thirst}%</p>
            <p>士气: ${resident.morale}%</p>
            <p>体力: ${resident.stamina}%</p>
            <br>
            <h4>技能</h4>
            <p>战斗: ${resident.skills.combat}</p>
            <p>医疗: ${resident.skills.medical}</p>
            <p>建造: ${resident.skills.build}</p>
            <p>搜索: ${resident.skills.scavenge}</p>
            <p>种植: ${resident.skills.farming}</p>
            <p>研究: ${resident.skills.research}</p>
            <br>
            <h4>特长</h4>
            <div class="resident-traits">
                ${resident.traits.map(t => {
                    const trait = ResidentSystem.getTrait(t);
                    return `<span class="trait-tag" title="${trait ? trait.desc : ''}">${trait ? trait.name : t}</span>`;
                }).join('')}
            </div>
            <br>
            <h4>工作分配</h4>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">选择职业和工作房间：</p>
            <select id="job-select" onchange="UI.changeResidentJob('${resident.id}', this.value)" style="width: 100%; padding: 8px; margin-bottom: 10px;">
                ${GameData.jobs.map(j => `
                    <option value="${j.id}" ${resident.job === j.id ? 'selected' : ''}>
                        ${j.icon} ${j.name}
                    </option>
                `).join('')}
            </select>
            ${this.getRoomAssignmentUI(resident)}
            <br><br>
            <h4>班次安排</h4>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">早班/夜班影响不同职业的工作效率：</p>
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px; line-height: 1.6;">
                • 守卫夜班效率 +30%<br>
                • 建筑工夜班效率 -30%<br>
                • 医生夜班效率 -20%<br>
                • 其他固定班次效率 +10%
            </div>
            <select id="shift-select" onchange="UI.changeResidentShift('${resident.id}', this.value)" style="width: 100%; padding: 8px; margin-bottom: 10px;">
                ${Object.values(ResidentSystem.shifts).map(s => `
                    <option value="${s.id}" ${resident.shift === s.id ? 'selected' : ''}>
                        ${s.icon} ${s.name}
                    </option>
                `).join('')}
            </select>
            <br><br>
            <button class="btn" onclick="document.getElementById('resident-detail').classList.add('hidden')">关闭</button>
        `;

        detailPanel.innerHTML = html;
        detailPanel.classList.remove('hidden');
    },

    getRoomAssignmentUI(resident) {
        const state = GameState.getState();
        const job = ResidentSystem.getJob(resident.job);
        
        if (resident.job === 'idle' || resident.job === 'scavenger' || resident.job === 'guard') {
            return '';
        }

        const suitableRooms = [];
        state.floors.forEach(floor => {
            floor.rooms.forEach(room => {
                const roomData = GameData.rooms.find(r => r.id === room.type);
                if (!roomData || room.health < 30) return;

                let suitable = false;
                if (resident.job === 'farmer' && room.type === 'farm') suitable = true;
                if (resident.job === 'water_worker' && room.type === 'water_plant') suitable = true;
                if (resident.job === 'builder' && (room.type === 'workshop' || room.type === 'power_room')) suitable = true;
                if (resident.job === 'doctor' && (room.type === 'medical_room' || room.type === 'quarantine')) suitable = true;
                if (resident.job === 'chef' && room.type === 'canteen') suitable = true;
                if (resident.job === 'scientist' && room.type === 'lab') suitable = true;

                if (suitable) {
                    suitableRooms.push({ room, floor, roomData });
                }
            });
        });

        if (suitableRooms.length === 0) {
            return '<p style="font-size: 11px; color: var(--warning);">⚠️ 没有合适的房间，请先建造对应房间</p>';
        }

        const floor = BuildingSystem.findRoomFloor(resident.assignedRoom);
        
        let html = `
            <div style="margin-top: 10px; padding: 10px; background: var(--bg-dark); border-radius: 5px;">
                <p style="font-size: 12px; margin-bottom: 8px;">
                    <strong>工作房间：</strong>
                    ${resident.assignedRoom ? 
                        (BuildingSystem.findRoom(resident.assignedRoom) ? 
                            `${BuildingSystem.findRoom(resident.assignedRoom).icon} ${GameData.rooms.find(r => r.id === BuildingSystem.findRoom(resident.assignedRoom).type).name} (${floor ? floor.name : ''})` 
                            : '未分配') 
                        : '未分配'}
                </p>
                <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">选择分配到的房间：</p>
                <select id="room-select" onchange="UI.assignResidentToRoom('${resident.id}', this.value)" style="width: 100%; padding: 6px; font-size: 12px;">
                    <option value="">-- 请选择房间 --</option>
                    ${suitableRooms.map(item => {
                        const currentWorkers = state.residents.filter(r => r.assignedRoom === item.room.id && r.id !== resident.id).length;
                        const maxWorkers = item.roomData.workers || 2;
                        const isAssigned = resident.assignedRoom === item.room.id;
                        return `<option value="${item.room.id}" ${isAssigned ? 'selected' : ''} ${currentWorkers >= maxWorkers && !isAssigned ? 'disabled' : ''}>
                            ${item.roomData.icon} ${item.roomData.name} (${item.floor.name}) - ${currentWorkers}/${maxWorkers}人
                            ${currentWorkers >= maxWorkers && !isAssigned ? ' (已满)' : ''}
                        </option>`;
                    }).join('')}
                </select>
                ${resident.assignedRoom ? `
                    <button class="btn" style="width: 100%; margin-top: 8px; padding: 6px; font-size: 11px;" 
                            onclick="UI.removeResidentFromRoom('${resident.id}')">
                        取消房间分配
                    </button>
                ` : ''}
            </div>
        `;

        return html;
    },

    assignResidentToRoom(residentId, roomId) {
        const state = GameState.getState();
        const resident = state.residents.find(r => r.id === residentId);
        if (!resident) return;

        if (!roomId) {
            this.removeResidentFromRoom(residentId);
            return;
        }

        const room = BuildingSystem.findRoom(roomId);
        if (!room) return;

        const roomData = GameData.rooms.find(r => r.id === room.type);
        const currentWorkers = state.residents.filter(r => r.assignedRoom === roomId).length;
        const maxWorkers = roomData.workers || 2;

        if (currentWorkers >= maxWorkers) {
            this.showToast('该房间工人已满', 'warning');
            return;
        }

        if (!ResidentSystem.isJobRoomMatch(resident.job, room.type)) {
            const job = ResidentSystem.getJob(resident.job);
            this.showToast(`${resident.name}（${job ? job.name : '未知'}）与${roomData.name}职业不匹配！`, 'warning');
            GameState.addLog(`${resident.name}（${job ? job.name : '未知'}）被分配到不匹配的${roomData.name}，将不会产生有效产出。`, 'warning');
        }

        resident.assignedRoom = roomId;
        GameState.addLog(`${resident.name} 被分配到${roomData.name}工作。`);
        this.showToast(`已分配到${roomData.name}`, 'success');
        this.showResidentDetail(residentId);
        this.renderAll();
        GameState.save();
    },

    removeResidentFromRoom(residentId) {
        const state = GameState.getState();
        const resident = state.residents.find(r => r.id === residentId);
        if (!resident) return;

        resident.assignedRoom = null;
        this.showToast('已取消房间分配', 'info');
        this.showResidentDetail(residentId);
        this.renderAll();
        GameState.save();
    },

    changeResidentJob(residentId, jobId) {
        ResidentSystem.assignJob(residentId, jobId);
        this.showResidentDetail(residentId);
        this.renderAll();
    },

    changeResidentShift(residentId, shiftId) {
        ResidentSystem.assignShift(residentId, shiftId);
        this.showResidentDetail(residentId);
        this.renderAll();
    },

    batchShift(jobIdsStr, shiftId) {
        const jobIds = jobIdsStr.split(',');
        const result = ResidentSystem.assignShiftByJob(jobIds, shiftId);
        const shift = ResidentSystem.getShift(shiftId);
        if (result.changed > 0) {
            UI.showToast(`成功调整了${result.changed}人的班次为${shift.name}`, 'success');
        } else if (result.total > 0) {
            UI.showToast(`这${result.total}人已经是${shift.name}了`, 'info');
        } else {
            UI.showToast('没有可调整的居民', 'info');
        }
        this.renderAll();
    },

    getStatusText(resident) {
        if (resident.onMission) return '外出探索';
        if (resident.status === 'sick') return '生病';
        if (resident.injured) return '受伤';
        return '健康';
    },

    renderWarehouse() {
        const state = GameState.getState();
        
        document.getElementById('wh-food').textContent = Math.floor(state.resources.food);
        document.getElementById('wh-water').textContent = Math.floor(state.resources.water);
        document.getElementById('wh-medicine').textContent = Math.floor(state.resources.medicine);
        document.getElementById('wh-bandage').textContent = Math.floor(state.resources.bandage || 0);
        document.getElementById('wh-materials').textContent = Math.floor(state.resources.materials);
        document.getElementById('wh-parts').textContent = Math.floor(state.resources.parts || 0);
        document.getElementById('wh-entertainment').textContent = Math.floor(state.resources.entertainment || 0);
        document.getElementById('wh-books').textContent = Math.floor(state.resources.books || 0);
    },

    renderExploration() {
        const locations = ExplorationSystem.getLocations();
        const locationsContainer = document.getElementById('explore-locations');
        
        let html = '';
        locations.forEach(loc => {
            const selected = ExplorationSystem.currentSelection === loc.id;
            html += `<div class="location-card ${selected ? 'selected' : ''}" onclick="UI.selectLocation('${loc.id}')">
                <div class="location-name">${loc.icon} ${loc.name}</div>
                <div class="location-desc">${loc.desc}</div>
                <div class="location-info">
                    <span>距离: ${loc.distance}</span>
                    <span>天数: ${loc.duration}</span>
                    <span>危险: ${Math.floor(loc.danger * 100)}%</span>
                </div>
            </div>`;
        });
        locationsContainer.innerHTML = html;

        this.renderTeamPanel();
        this.renderActiveMissions();
    },

    selectLocation(locationId) {
        ExplorationSystem.selectLocation(locationId);
        this.renderExploration();
    },

    renderTeamPanel() {
        const teamPanel = document.getElementById('explore-team');
        
        if (!ExplorationSystem.currentSelection) {
            teamPanel.innerHTML = '<p class="hint">请先选择探索地点</p>';
            return;
        }

        const available = ExplorationSystem.getAvailableResidents();
        const selected = ExplorationSystem.selectedTeam;

        let html = '<p><strong>已选队员：</strong> ' + selected.length + '/3</p>';
        
        html += '<div style="margin: 10px 0;">';
        selected.forEach(resId => {
            const res = GameState.getState().residents.find(r => r.id === resId);
            if (res) {
                html += `<div class="team-member" onclick="UI.toggleTeamMember('${res.id}')">
                    <div class="avatar">${res.avatar}</div>
                    <span>${res.name}</span>
                    <span style="margin-left:auto; font-size: 11px; color: var(--text-muted);">点击移除</span>
                </div>`;
            }
        });
        html += '</div>';

        html += '<p style="font-size: 12px; color: var(--text-muted); margin: 10px 0;">可选居民：</p>';
        available.forEach(res => {
            if (!selected.includes(res.id)) {
                html += `<div class="team-member" style="opacity: 0.7;" onclick="UI.toggleTeamMember('${res.id}')">
                    <div class="avatar">${res.avatar}</div>
                    <span>${res.name}</span>
                    <span style="margin-left:auto; font-size: 11px; color: var(--success);">+ 加入</span>
                </div>`;
            }
        });

        html += `<button class="btn btn-primary" style="width: 100%; margin-top: 15px;" onclick="UI.startMission()" ${selected.length === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            出发探索
        </button>`;

        teamPanel.innerHTML = html;
    },

    toggleTeamMember(residentId) {
        ExplorationSystem.addToTeam(residentId);
        this.renderTeamPanel();
    },

    startMission() {
        ExplorationSystem.startMission();
        this.renderAll();
    },

    renderActiveMissions() {
        const container = document.getElementById('explore-active');
        const missions = ExplorationSystem.getActiveMissions();

        if (missions.length === 0) {
            container.innerHTML = '<p class="hint">暂无进行中的任务</p>';
            return;
        }

        let html = '';
        missions.forEach(mission => {
            const progress = ((mission.duration - mission.daysLeft) / mission.duration) * 100;
            const teamNames = mission.team.map(id => {
                const res = GameState.getState().residents.find(r => r.id === id);
                return res ? res.name : '未知';
            }).join('、');

            html += `<div class="mission-card">
                <div class="mission-title">${mission.locationName}</div>
                <p style="font-size: 11px; color: var(--text-muted);">队员：${teamNames}</p>
                <div class="mission-progress">
                    <div class="mission-progress-fill" style="width: ${progress}%"></div>
                </div>
                <p style="font-size: 11px; text-align: right; color: var(--text-muted);">还剩 ${mission.daysLeft} 天</p>
            </div>`;
        });

        container.innerHTML = html;
    },

    renderBuilding() {
        const state = GameState.getState();
        const floorList = document.getElementById('floor-list');
        
        let html = '';
        state.floors.forEach(floor => {
            html += `<div class="floor-item">
                <div class="floor-header">
                    <strong>${floor.name}</strong>
                    <span style="font-size: 11px; color: var(--text-muted);">${floor.rooms.length}/${floor.maxRooms} 房间</span>
                </div>
                <div class="floor-rooms-preview">`;
            
            for (let i = 0; i < floor.maxRooms; i++) {
                const room = floor.rooms[i];
                if (room) {
                    const roomData = GameData.rooms.find(r => r.id === room.type);
                    html += `<div class="room-mini" title="${roomData.name} (${room.health}%)" onclick="UI.showRoomDetail('${room.id}')">${roomData.icon}</div>`;
                } else {
                    html += `<div class="room-mini" style="opacity: 0.3;" title="空地">+</div>`;
                }
            }
            
            html += '</div></div>';
        });
        
        html += `<button class="btn" style="width: 100%; margin-top: 10px;" onclick="UI.addFloor()">
            ➕ 扩建楼层 (材料: ${50 + state.floors.length * 20})
        </button>`;

        floorList.innerHTML = html;

        const buildOptions = document.getElementById('build-options');
        let buildHtml = '';
        GameData.rooms.forEach(room => {
            const costStr = Object.entries(room.cost)
                .map(([k, v]) => `${this.getResourceName(k)}:${v}`)
                .join(', ');
            
            buildHtml += `<div class="build-option" onclick="UI.showBuildMenuForRoom('${room.id}')">
                <div class="build-option-info">
                    <div class="build-option-name">${room.icon} ${room.name}</div>
                    <div class="build-option-desc">${room.desc}</div>
                </div>
                <div class="build-option-cost">${costStr}</div>
            </div>`;
        });
        buildOptions.innerHTML = buildHtml;

        const repairQueueContainer = document.getElementById('repair-queue');
        const repairQueue = BuildingSystem.getRepairQueue();
        
        if (repairQueue.length === 0) {
            repairQueueContainer.innerHTML = '<p class="hint">暂无维修任务，点击房间详情或系统维修创建任务</p>';
        } else {
            let rqHtml = '';
            repairQueue.forEach(task => {
                const state = GameState.getState();
                const assignedWorkers = task.assignedWorkers.map(id => state.residents.find(r => r.id === id)).filter(Boolean);
                const availableWorkers = BuildingSystem.getAvailableRepairWorkers().filter(w => !task.assignedWorkers.includes(w.id));
                let targetName = '';
                if (task.targetType === 'power') targetName = '🔌 电力系统';
                else if (task.targetType === 'gate') targetName = '🚪 门禁系统';
                else if (task.targetType === 'room') {
                    const room = BuildingSystem.findRoom(task.targetId);
                    const roomData = room ? GameData.rooms.find(r => r.id === room.type) : null;
                    targetName = room ? `${roomData?.icon || '🏠'} ${roomData?.name || '房间'}` : '未知房间';
                }

                const progressPercent = Math.floor((task.progress / task.maxProgress) * 100);
                const estimatedDays = BuildingSystem.getEstimatedDays(task);
                const materialsSpent = task.materialsSpent || 0;
                const partsSpent = task.partsSpent || 0;

                rqHtml += `<div class="patient-card" style="margin-bottom: 10px;">
                    <div class="patient-info">
                        <div class="patient-name">${targetName}</div>
                        <div class="patient-condition">进度: ${progressPercent}% / 100% | 预计: ${estimatedDays === '∞' ? '需分配工人' : `还剩${estimatedDays}天`} | 已投入: ${materialsSpent}材料${partsSpent > 0 ? `、${partsSpent}零件` : ''}</div>
                        <div style="width: 100%; height: 6px; background: var(--bg-dark); border-radius: 3px; margin-top: 4px; overflow: hidden;">
                            <div style="width: ${progressPercent}%; height: 100%; background: var(--primary);"></div>
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                            工人: ${assignedWorkers.length}人 | 创建于第${task.createdAt}天
                        </div>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 5px; align-items: flex-start;">
                        ${assignedWorkers.map(w => `
                            <div style="background: var(--bg-dark); padding: 3px 8px; border-radius: 4px; font-size: 11px; display: flex; align-items: center; gap: 3px;">
                                ${w.avatar} ${w.name}
                                <button class="btn" style="padding: 0 4px; font-size: 10px; margin-left: 3px;"
                                        onclick="UI.removeWorkerFromRepair('${task.id}', '${w.id}')">✕</button>
                            </div>
                        `).join('')}
                        ${availableWorkers.length > 0 ? `
                            <select style="padding: 2px 4px; font-size: 11px;" id="add-repair-worker-${task.id}">
                                <option value="">+ 添加工人</option>
                                ${availableWorkers.map(w => `
                                    <option value="${w.id}">${w.avatar} ${w.name} (${ResidentSystem.getJob(w.job).name})</option>
                                `).join('')}
                            </select>
                            <button class="btn" style="padding: 2px 8px; font-size: 11px;"
                                    onclick="UI.addWorkerToRepair('${task.id}')">确定</button>
                        ` : ''}
                        <button class="btn" style="padding: 2px 8px; font-size: 11px;"
                                onclick="UI.cancelRepairTask('${task.id}')">取消任务</button>
                    </div>
                </div>`;
            });
            repairQueueContainer.innerHTML = rqHtml;
        }
    },

    addWorkerToRepair(taskId) {
        const select = document.getElementById(`add-repair-worker-${taskId}`);
        if (!select || !select.value) return;
        BuildingSystem.assignWorkerToRepair(taskId, select.value);
        this.renderAll();
    },

    removeWorkerFromRepair(taskId, residentId) {
        BuildingSystem.removeWorkerFromRepair(taskId, residentId);
        this.renderAll();
    },

    cancelRepairTask(taskId) {
        const result = BuildingSystem.removeRepairTask(taskId);
        if (result && result.success) {
            let html = `
                <h4>${result.taskName} - 维修任务取消报告</h4>
                <p>完成进度: <strong>${result.progress}%</strong></p>
                <br>
                <div style="background: var(--bg-dark); padding: 12px; border-radius: 6px;">
                    <p>📦 物资明细:</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
                        <p>材料已投入: <strong>${result.materialsSpent}</strong></p>
                        <p>材料已消耗: <strong>${result.materialsUsed}</strong></p>
                        <p style="color: var(--success);">材料已返还: <strong>${result.materialsReturned}</strong></p>
                        <p>零件已投入: <strong>${result.partsSpent}</strong></p>
                        <p>零件已消耗: <strong>${result.partsUsed}</strong></p>
                        <p style="color: var(--success);">零件已返还: <strong>${result.partsReturned}</strong></p>
                    </div>
                </div>
            `;
            if (result.reasonNoReturn && result.reasonNoReturn.length > 0) {
                html += `
                    <br>
                    <p style="font-size: 12px; color: var(--warning);">
                        <strong>💡 说明:</strong><br>
                        ${result.reasonNoReturn.map(r => '• ' + r).join('<br>')}
                    </p>
                `;
            }
            if (result.materialsReturned > 0 || result.partsReturned > 0) {
                let total = [];
                if (result.materialsReturned > 0) total.push(`${result.materialsReturned}材料`);
                if (result.partsReturned > 0) total.push(`${result.partsReturned}零件`);
                UI.showToast(`已返还 ${total.join('、')}`, 'success');
            }
            this.showModal('维修任务已取消', html);
        } else if (result && result.reason) {
            UI.showToast(result.reason, 'error');
        }
        this.renderAll();
    },

    createRepairTaskForRoom(roomId) {
        BuildingSystem.addRepairTask('room', roomId, []);
        this.hideModal();
        this.renderAll();
    },

    createRepairTaskForSystem(systemType) {
        BuildingSystem.addRepairTask(systemType, systemType, []);
        this.renderAll();
    },

    getResourceName(type) {
        const names = {
            food: '食物',
            water: '水',
            medicine: '药品',
            materials: '材料',
            parts: '零件',
            bandage: '绷带'
        };
        return names[type] || type;
    },

    showBuildMenu(floorNumber) {
        const state = GameState.getState();
        const floor = state.floors.find(f => f.number === floorNumber);
        
        let html = `<p>选择要建造的房间：</p><div style="max-height: 300px; overflow-y: auto;">`;
        
        GameData.rooms.forEach(room => {
            const costStr = Object.entries(room.cost)
                .map(([k, v]) => `${this.getResourceName(k)} ${v}`)
                .join('、');
            
            const canBuild = BuildingSystem.canBuild(room.id, floorNumber).canBuild;
            
            html += `<div class="build-option" style="cursor: ${canBuild ? 'pointer' : 'not-allowed'}; opacity: ${canBuild ? 1 : 0.5};"
                    onclick="${canBuild ? `UI.buildRoom('${room.id}', ${floorNumber})` : ''}">
                <div class="build-option-info">
                    <div class="build-option-name">${room.icon} ${room.name}</div>
                    <div class="build-option-desc">${room.desc}</div>
                </div>
                <div class="build-option-cost">${costStr}</div>
            </div>`;
        });
        
        html += '</div>';
        
        this.showModal('建造房间 - ' + floor.name, html);
    },

    showBuildMenuForRoom(roomId) {
        const state = GameState.getState();
        const availableFloors = BuildingSystem.getAvailableFloors();
        
        if (availableFloors.length === 0) {
            this.showToast('没有可用的楼层', 'warning');
            return;
        }

        let html = '<p>选择建造楼层：</p>';
        const roomData = GameData.rooms.find(r => r.id === roomId);
        
        availableFloors.forEach(floor => {
            const canBuild = BuildingSystem.canBuild(roomId, floor.number).canBuild;
            html += `<button class="btn" style="width: 100%; margin-bottom: 8px; ${canBuild ? '' : 'opacity: 0.5; cursor: not-allowed;'}"
                    onclick="${canBuild ? `UI.buildRoom('${roomId}', ${floor.number})` : ''}">
                ${floor.name} (${floor.rooms.length}/${floor.maxRooms})
            </button>`;
        });

        this.showModal(`建造 ${roomData.name}`, html);
    },

    buildRoom(roomId, floorNumber) {
        BuildingSystem.buildRoom(roomId, floorNumber);
        this.hideModal();
        this.renderAll();
    },

    addFloor() {
        BuildingSystem.addFloor();
        this.renderAll();
    },

    showRoomDetail(roomId) {
        const state = GameState.getState();
        const room = BuildingSystem.findRoom(roomId);
        const floor = BuildingSystem.findRoomFloor(roomId);
        const roomData = GameData.rooms.find(r => r.id === room.type);
        
        const assignedWorkers = state.residents.filter(r => r.assignedRoom === roomId);
        const maxWorkers = roomData.workers || 2;
        
        let html = `
            <h3>${roomData.icon} ${roomData.name}</h3>
            <p>楼层: ${floor.name}</p>
            <p>耐久度: ${room.health}%</p>
            <p>描述: ${roomData.desc}</p>
        `;
        
        if (roomData.production || roomData.workers) {
            html += `
                <br>
                <h4>工人管理</h4>
                <p style="font-size: 12px; color: var(--text-muted);">
                    当前工人: ${assignedWorkers.length}/${maxWorkers}人
                </p>
            `;
            
            if (assignedWorkers.length > 0) {
                html += '<div style="margin: 10px 0;">';
                assignedWorkers.forEach(worker => {
                    html += `
                        <div class="team-member" style="margin-bottom: 5px;">
                            <div class="avatar">${worker.avatar}</div>
                            <span>${worker.name}</span>
                            <button class="btn" style="margin-left: auto; padding: 2px 8px; font-size: 10px;"
                                    onclick="UI.removeResidentFromRoom('${worker.id}'); UI.showRoomDetail('${roomId}');">
                                移除
                            </button>
                        </div>
                    `;
                });
                html += '</div>';
            }
            
            if (assignedWorkers.length < maxWorkers) {
                const availableWorkers = state.residents.filter(r => 
                    r.status === 'healthy' && 
                    !r.onMission && 
                    !r.assignedRoom &&
                    r.job !== 'idle' && 
                    r.job !== 'scavenger' &&
                    r.job !== 'guard'
                );
                
                const suitableWorkers = availableWorkers.filter(worker => {
                    if (worker.job === 'farmer' && room.type === 'farm') return true;
                    if (worker.job === 'water_worker' && room.type === 'water_plant') return true;
                    if (worker.job === 'builder' && (room.type === 'workshop' || room.type === 'power_room')) return true;
                    if (worker.job === 'doctor' && (room.type === 'medical_room' || room.type === 'quarantine')) return true;
                    if (worker.job === 'chef' && room.type === 'canteen') return true;
                    if (worker.job === 'scientist' && room.type === 'lab') return true;
                    return false;
                });
                
                if (suitableWorkers.length > 0) {
                    html += `
                        <p style="font-size: 11px; color: var(--text-muted); margin-top: 10px;">可分配的居民：</p>
                        <select id="add-worker-select" style="width: 100%; padding: 6px; font-size: 12px; margin-bottom: 8px;">
                            <option value="">-- 选择居民 --</option>
                            ${suitableWorkers.map(w => `
                                <option value="${w.id}">${w.avatar} ${w.name} (${ResidentSystem.getJob(w.job).name})</option>
                            `).join('')}
                        </select>
                        <button class="btn btn-primary" style="width: 100%; padding: 6px; font-size: 12px;"
                                onclick="UI.addWorkerToRoom('${roomId}')">
                            + 添加工人
                        </button>
                    `;
                } else {
                    html += '<p style="font-size: 11px; color: var(--text-muted);">没有合适的待分配居民</p>';
                }
            }
        }
        
        html += `
            <br>
            <p style="font-size: 11px; color: var(--text-muted);">耐久度低于100%时可创建维修任务</p>
            <button class="btn" onclick="UI.createRepairTaskForRoom('${roomId}')" style="${room.health < 100 ? '' : 'opacity: 0.5; cursor: not-allowed;'}">🔧 创建维修任务 (材料: ${Math.ceil((100 - room.health) / 10) * 2})</button>
        `;
        
        this.showModal(roomData.name, html);
    },

    addWorkerToRoom(roomId) {
        const select = document.getElementById('add-worker-select');
        if (!select || !select.value) return;
        
        this.assignResidentToRoom(select.value, roomId);
        this.showRoomDetail(roomId);
    },

    repairRoom(roomId) {
        BuildingSystem.repairRoom(roomId);
        this.hideModal();
        this.renderAll();
    },

    renderMedical() {
        const state = GameState.getState();
        
        document.getElementById('med-level').textContent = '1';
        document.getElementById('med-beds').textContent = `${MedicalSystem.getMedicalBedsUsed()}/${ResourceSystem.getMedicalBeds()}`;
        document.getElementById('med-quarantine').textContent = `${MedicalSystem.getQuarantineBedsUsed()}/${ResourceSystem.getQuarantineBeds()}`;
        document.getElementById('med-doctors').textContent = MedicalSystem.getDoctors().length;

        const medBeds = ResourceSystem.getMedicalBeds();
        const medUsed = MedicalSystem.getMedicalBedsUsed();
        const quarantineBeds = ResourceSystem.getQuarantineBeds();
        const quarantinedCount = MedicalSystem.getQuarantined().length;

        const patientList = document.getElementById('patient-list');
        const patients = MedicalSystem.getPatients().filter(p => !p.quarantined && !p.hospitalized);
        
        if (patients.length === 0) {
            patientList.innerHTML = '<p class="hint">暂无病患</p>';
        } else {
            let html = '';
            patients.forEach(patient => {
                let condition = '';
                let actions = '';
                
                if (patient.status === 'sick') {
                    const disease = ResidentSystem.getDisease(patient.sickType);
                    const severityName = ResidentSystem.getSeverityName(patient.sickSeverity);
                    const infectious = disease?.infectious ? '⚠️ 传染' : '';
                    condition = `${disease?.name || '疾病'}（${severityName}）${infectious}`;
                    const medCost = patient.sickSeverity === 'critical' ? 5 : patient.sickSeverity === 'severe' ? 3 : 2;
                    actions = `<button class="btn" style="padding: 4px 10px; font-size: 11px; margin-right: 5px;" onclick="UI.treatSick('${patient.id}')">治疗 (药品x${medCost})</button>`;
                    
                    if (patient.treatmentProgress > 0) {
                        actions += `<div style="flex-basis: 100%; font-size: 11px; color: var(--text-muted);">治疗进度: ${Math.floor(patient.treatmentProgress)}%</div>`;
                    }

                    if (!patient.quarantined && disease?.infectious) {
                        const canQuarantine = quarantinedCount < quarantineBeds;
                        actions += `<button class="btn" style="padding: 4px 10px; font-size: 11px; margin-right: 5px; ${canQuarantine ? '' : 'opacity: 0.5; cursor: not-allowed;'}" 
                                    onclick="${canQuarantine ? `UI.quarantine('${patient.id}')` : ''}">
                            ${canQuarantine ? '送隔离' : '隔离满'}
                        </button>`;
                    }

                    const canHospitalize = medUsed < medBeds;
                    actions += `<button class="btn" style="padding: 4px 10px; font-size: 11px; ${canHospitalize ? '' : 'opacity: 0.5; cursor: not-allowed;'}" 
                                onclick="${canHospitalize ? `UI.hospitalize('${patient.id}')` : ''}">
                        ${canHospitalize ? '送医疗室' : '病床满'}
                    </button>`;
                }
                if (patient.injured) {
                    const injText = patient.injurySeverity > 50 ? '重伤' : patient.injurySeverity > 20 ? '轻伤' : '微伤';
                    condition = condition ? condition + ' / ' + injText + `(${Math.floor(patient.injurySeverity)}%)` : injText + `(${Math.floor(patient.injurySeverity)}%)`;
                    actions += `<button class="btn" style="padding: 4px 10px; font-size: 11px;" onclick="UI.treatInjury('${patient.id}')">治伤</button>`;
                    if (!patient.hospitalized && patient.injurySeverity > 30) {
                        const canHospitalize = medUsed < medBeds;
                        actions += `<button class="btn" style="padding: 4px 10px; font-size: 11px; margin-left: 5px; ${canHospitalize ? '' : 'opacity: 0.5; cursor: not-allowed;'}" 
                                    onclick="${canHospitalize ? `UI.hospitalize('${patient.id}')` : ''}">
                            ${canHospitalize ? '送医疗室' : '病床满'}
                        </button>`;
                    }
                }
                
                html += `<div class="patient-card">
                    <div class="patient-info">
                        <div class="patient-name">${patient.avatar} ${patient.name}</div>
                        <div class="patient-condition">${condition}</div>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                        ${actions}
                    </div>
                </div>`;
            });
            patientList.innerHTML = html;
        }

        const medRoomList = document.getElementById('medical-room-list');
        const hospitalized = MedicalSystem.getHospitalized();
        if (medRoomList) {
            if (hospitalized.length === 0) {
                medRoomList.innerHTML = `<p class="hint">医疗室为空 (${medUsed}/${medBeds}床位)</p>`;
            } else {
                let html = `<p style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">医疗床位: ${medUsed}/${medBeds}</p>`;
                hospitalized.forEach(patient => {
                    let condition = '';
                    let actions = '';
                    
                    if (patient.status === 'sick') {
                        const disease = ResidentSystem.getDisease(patient.sickType);
                        const severityName = ResidentSystem.getSeverityName(patient.sickSeverity);
                        condition = `${disease?.name || '疾病'}（${severityName}）`;
                        const medCost = patient.sickSeverity === 'critical' ? 5 : patient.sickSeverity === 'severe' ? 3 : 2;
                        actions = `<button class="btn" style="padding: 4px 10px; font-size: 11px; margin-right: 5px;" onclick="UI.treatSick('${patient.id}')">治疗 (药品x${medCost})</button>`;
                        if (patient.treatmentProgress > 0) {
                            actions += `<div style="flex-basis: 100%; font-size: 11px; color: var(--primary);">治疗进度: ${Math.floor(patient.treatmentProgress)}%</div>`;
                        }
                    }
                    if (patient.injured) {
                        condition = condition ? condition + ' / 受伤' + `(${Math.floor(patient.injurySeverity)}%)` : '受伤' + `(${Math.floor(patient.injurySeverity)}%)`;
                        actions += `<button class="btn" style="padding: 4px 10px; font-size: 11px;" onclick="UI.treatInjury('${patient.id}')">治伤</button>`;
                    }
                    actions += `<button class="btn" style="padding: 4px 10px; font-size: 11px; margin-left: 5px;" onclick="UI.dischargeFromHospital('${patient.id}')">离开医疗室</button>`;
                    
                    html += `<div class="patient-card">
                        <div class="patient-info">
                            <div class="patient-name">${patient.avatar} ${patient.name} 🏥</div>
                            <div class="patient-condition">住院治疗 - ${condition}</div>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                            ${actions}
                        </div>
                    </div>`;
                });
                medRoomList.innerHTML = html;
            }
        }

        const quarantineList = document.getElementById('quarantine-list');
        const quarantined = MedicalSystem.getQuarantined();
        
        if (quarantined.length === 0) {
            quarantineList.innerHTML = `<p class="hint">隔离区为空 (${quarantinedCount}/${quarantineBeds}床位)</p>`;
        } else {
            let html = `<p style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">隔离床位: ${quarantinedCount}/${quarantineBeds}</p>`;
            quarantined.forEach(patient => {
                let condition = '';
                let actions = '';
                if (patient.status === 'sick') {
                    const disease = ResidentSystem.getDisease(patient.sickType);
                    const severityName = ResidentSystem.getSeverityName(patient.sickSeverity);
                    condition = `${disease?.name || '疾病'}（${severityName}）`;
                    const medCost = patient.sickSeverity === 'critical' ? 5 : patient.sickSeverity === 'severe' ? 3 : 2;
                    actions += `<button class="btn" style="padding: 4px 10px; font-size: 11px; margin-right: 5px;" onclick="UI.treatSick('${patient.id}')">治疗 (药品x${medCost})</button>`;
                    if (patient.treatmentProgress > 0) {
                        actions += `<div style="flex-basis: 100%; font-size: 11px; color: var(--primary);">治疗进度: ${Math.floor(patient.treatmentProgress)}%</div>`;
                    }
                }
                if (patient.injured) {
                    condition = condition ? condition + ' / 受伤' : '受伤';
                    actions += `<button class="btn" style="padding: 4px 10px; font-size: 11px; margin-right: 5px;" onclick="UI.treatInjury('${patient.id}')">治伤</button>`;
                }
                actions += `<button class="btn" style="padding: 4px 10px; font-size: 11px;" onclick="UI.unquarantine('${patient.id}')">解除隔离</button>`;
                
                html += `<div class="patient-card">
                    <div class="patient-info">
                        <div class="patient-name">${patient.avatar} ${patient.name} ⚠️</div>
                        <div class="patient-condition">隔离中 - ${condition}</div>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                        ${actions}
                    </div>
                </div>`;
            });
            quarantineList.innerHTML = html;
        }
    },

    hospitalize(residentId) {
        if (MedicalSystem.hospitalize(residentId)) {
            this.renderAll();
        }
    },

    dischargeFromHospital(residentId) {
        if (MedicalSystem.dischargeFromHospital(residentId)) {
            this.renderAll();
        }
    },

    treatSick(residentId) {
        if (MedicalSystem.treatSick(residentId)) {
            const resident = GameState.getState().residents.find(r => r.id === residentId);
            if (resident && resident.status === 'healthy' && resident.quarantined) {
                MedicalSystem.unquarantine(residentId);
            }
        }
        this.renderAll();
        GameState.save();
    },

    treatInjury(residentId) {
        MedicalSystem.treatInjury(residentId);
        this.renderAll();
        GameState.save();
    },

    quarantine(residentId) {
        if (MedicalSystem.quarantine(residentId)) {
            this.renderAll();
            GameState.save();
        }
    },

    unquarantine(residentId) {
        if (MedicalSystem.unquarantine(residentId)) {
            this.renderAll();
            GameState.save();
        }
    },

    renderEvents() {
        const events = EventSystem.getPendingEvents();
        const container = document.getElementById('current-events');
        
        if (events.length === 0) {
            container.innerHTML = '<p class="hint">暂无待处理事件</p>';
        } else {
            let html = '';
            events.forEach(event => {
                const typeClass = event.urgent ? 'urgent' : (event.type === 'stranger' ? 'info' : '');
                html += `<div class="event-card ${typeClass}">
                    <div class="event-title">${event.title}</div>
                    <div class="event-desc">${event.desc}</div>
                    <div class="event-choices">
                        ${event.choices.map((choice, idx) => 
                            `<button class="event-choice" onclick="UI.resolveEvent('${event.id}', ${idx})">${choice.text}</button>`
                        ).join('')}
                    </div>
                </div>`;
            });
            container.innerHTML = html;
        }

        const history = EventSystem.getEventHistory();
        const logContainer = document.getElementById('event-log');
        
        let logHtml = '';
        history.slice(0, 20).forEach(event => {
            const choice = event.choices[event.chosenChoice];
            logHtml += `<div class="event-log-item">
                <span class="date">第${event.day}天</span>
                <strong>${event.title}</strong> - ${choice ? choice.text : '已处理'}
            </div>`;
        });
        
        if (history.length === 0) {
            logHtml = '<p class="hint">暂无历史事件</p>';
        }
        
        logContainer.innerHTML = logHtml;
    },

    resolveEvent(eventId, choiceIndex) {
        EventSystem.resolveEvent(eventId, choiceIndex);
        this.renderAll();
    },

    renderStats() {
        const state = GameState.getState();
        
        document.getElementById('stat-days').textContent = state.day;
        document.getElementById('stat-cur-pop').textContent = state.residents.length;
        document.getElementById('stat-total-join').textContent = state.stats.totalJoined;
        document.getElementById('stat-deaths').textContent = state.stats.totalDeaths;

        const achievementsList = document.getElementById('achievements-list');
        let html = '';
        GameData.achievements.forEach(achievement => {
            const unlocked = state.achievements.includes(achievement.id);
            html += `<div class="achievement-item ${unlocked ? '' : 'locked'}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div>
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-desc">${achievement.desc}</div>
                </div>
            </div>`;
        });
        achievementsList.innerHTML = html;

        document.querySelector('[data-diff="hard"]').classList.toggle('locked', !GameState.isDifficultyUnlocked('hard'));
        document.querySelector('[data-diff="nightmare"]').classList.toggle('locked', !GameState.isDifficultyUnlocked('nightmare'));

        const highScores = GameState.getHighScores();
        const highScoresList = document.getElementById('high-scores-list');
        if (highScores.length === 0) {
            highScoresList.innerHTML = '<p class="hint">暂无历史记录</p>';
        } else {
            let hsHtml = '';
            highScores.slice(0, 5).forEach((score, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                const diffMap = { easy: '简单', normal: '普通', hard: '困难', nightmare: '噩梦' };
                hsHtml += `<div class="achievement-item">
                    <div class="achievement-icon">${medal}</div>
                    <div>
                        <div class="achievement-name">${diffMap[score.difficulty] || score.difficulty} - ${score.days}天</div>
                        <div class="achievement-desc">${score.population}人存活 · ${score.score}分 · ${score.ending || '未完成结局'}</div>
                    </div>
                </div>`;
            });
            highScoresList.innerHTML = hsHtml;
        }
    },

    showModal(title, body, footer = '') {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = body;
        document.getElementById('modal-footer').innerHTML = footer;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    hideModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    },

    showConfirmModal(title, message, onConfirm) {
        const footer = `
            <button class="btn" onclick="UI.hideModal()">取消</button>
            <button class="btn btn-primary" id="confirm-btn">确定</button>
        `;
        this.showModal(title, `<p>${message}</p>`, footer);
        
        setTimeout(() => {
            document.getElementById('confirm-btn').addEventListener('click', () => {
                this.hideModal();
                onConfirm();
            });
        }, 10);
    },

    showDailyReport(report) {
        const state = GameState.getState();
        const day = report.day || state.day;
        
        let html = `
            <div style="font-size: 13px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4 style="margin: 0; color: var(--primary);">📊 第${day}天 - 经营日报</h4>
                    <span style="font-size: 12px; color: var(--text-muted);">
                        士气: <strong style="color: ${report.moraleChange >= 0 ? 'var(--success)' : 'var(--danger)'};">
                            ${report.moraleChange >= 0 ? '+' : ''}${report.moraleChange}
                        </strong> (${report.morale}%)
                    </span>
                </div>
        `;

        html += `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;">
                <div style="background: var(--bg-dark); padding: 10px; border-radius: 6px;">
                    <p style="color: var(--success); margin-bottom: 8px;"><strong>📦 物资产出</strong></p>
                    <p>🍞 食物: +${report.production.food}</p>
                    <p>💧 水: +${report.production.water}</p>
                    ${report.production.materials > 0 ? `<p>🔧 材料: +${report.production.materials}</p>` : ''}
                    ${report.production.parts > 0 ? `<p>⚙️ 零件: +${report.production.parts}</p>` : ''}
                    ${!report.facilities.powerWorking ? '<p style="color: var(--danger); margin-top: 6px;">⚠ 电力故障，产出受阻</p>' : ''}
                </div>
                <div style="background: var(--bg-dark); padding: 10px; border-radius: 6px;">
                    <p style="color: var(--warning); margin-bottom: 8px;"><strong>🍽️ 物资消耗</strong></p>
                    <p>🍞 食物: -${report.consumption.food}</p>
                    <p>💧 水: -${report.consumption.water}</p>
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color);">
                        <p>当日净变化:</p>
                        <p style="color: ${report.netChange.food >= 0 ? 'var(--success)' : 'var(--danger)'};">
                            🍞 食物: ${report.netChange.food >= 0 ? '+' : ''}${report.netChange.food}
                        </p>
                        <p style="color: ${report.netChange.water >= 0 ? 'var(--success)' : 'var(--danger)'};">
                            💧 水: ${report.netChange.water >= 0 ? '+' : ''}${report.netChange.water}
                        </p>
                    </div>
                </div>
            </div>
        `;

        html += `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;">
                <div style="background: var(--bg-dark); padding: 10px; border-radius: 6px;">
                    <p style="color: var(--info); margin-bottom: 8px;"><strong>🏥 医疗进展</strong></p>
                    <p>今日康复: <strong style="color: var(--success);">${report.healing.healed}</strong> 人</p>
                    <p>当前患病人数: ${report.healing.sickCount} 人</p>
                </div>
                <div style="background: var(--bg-dark); padding: 10px; border-radius: 6px;">
                    <p style="color: var(--warning); margin-bottom: 8px;"><strong>🛡️ 安保状态</strong></p>
                    <p>防御值: <strong>${report.security.defense}</strong></p>
                    <p>执勤守卫: ${report.security.guardsOnDuty} 人</p>
                    ${!report.facilities.gateWorking ? '<p style="color: var(--danger);">⚠ 门禁损坏，防御下降</p>' : ''}
                </div>
            </div>
        `;

        if (report.repairs && report.repairs.length > 0) {
            html += `
                <div style="background: var(--bg-dark); padding: 10px; border-radius: 6px; margin-bottom: 15px;">
                    <p style="color: var(--primary); margin-bottom: 8px;"><strong>🔨 维修进度</strong></p>
            `;
            report.repairs.forEach(r => {
                html += `
                    <div style="padding: 6px 0; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between;">
                            <span>${r.name}</span>
                            <span style="color: ${r.progressGained > 0 ? 'var(--success)' : 'var(--text-muted)'};">
                                ${r.progressGained > 0 ? '+' + r.progressGained + '%' : '无进展'}
                            </span>
                        </div>
                        <div style="margin-top: 4px;">
                            <div style="width: 100%; height: 6px; background: var(--bg-card); border-radius: 3px;">
                                <div style="width: ${r.progress}%; height: 100%; background: var(--primary); border-radius: 3px;"></div>
                            </div>
                            <p style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">
                                总进度: ${r.progress}% | ${r.workers}名工人 | 预计还需 ${r.estimatedDays === null ? '需分配工人' : r.estimatedDays + '天'}
                            </p>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        html += `
            <div style="background: var(--bg-dark); padding: 10px; border-radius: 6px; margin-bottom: 15px;">
                <p style="color: var(--danger); margin-bottom: 8px;"><strong>💀 伤亡情况</strong></p>
                ${report.casualties.totalDeaths === 0 && report.casualties.newInjured === 0 
                    ? '<p style="color: var(--success);">今日无伤亡 🎉</p>' 
                    : `
                        ${report.casualties.totalDeaths > 0 ? `
                            <p>今日死亡: <strong style="color: var(--danger);">${report.casualties.totalDeaths}</strong> 人</p>
                            <ul style="font-size: 12px; color: var(--text-secondary); padding-left: 20px; margin: 4px 0;">
                                ${report.casualties.normalDeaths > 0 ? `<li>正常死亡: ${report.casualties.normalDeaths}人</li>` : ''}
                                ${report.casualties.sickDeaths > 0 ? `<li>病亡: ${report.casualties.sickDeaths}人</li>` : ''}
                                ${report.casualties.explorationDeaths > 0 ? `<li>探索牺牲: ${report.casualties.explorationDeaths}人</li>` : ''}
                            </ul>
                        ` : ''}
                        ${report.casualties.newInjured > 0 ? `<p>新增受伤: <strong>${report.casualties.newInjured}</strong> 人</p>` : ''}
                    `
                }
            </div>
        `;

        if (report.facilities.powerChanged || report.facilities.gateChanged) {
            html += `
                <div style="background: rgba(255, 152, 0, 0.1); padding: 10px; border-radius: 6px; border: 1px solid var(--warning);">
                    <p style="color: var(--warning); margin-bottom: 5px;"><strong>⚡ 设施变化</strong></p>
                    ${report.facilities.powerChanged ? `<p>电力系统: ${report.facilities.powerWorking ? '<span style="color: var(--success);">✓ 已修复</span>' : '<span style="color: var(--danger);">⚠ 发生故障</span>'}</p>` : ''}
                    ${report.facilities.gateChanged ? `<p>门禁系统: ${report.facilities.gateWorking ? `<span style="color: var(--success);">✓ 正常 (耐久${report.facilities.gateHealth}%)</span>` : `<span style="color: var(--danger);">⚠ 损坏 (耐久${report.facilities.gateHealth}%)</span>`}</p>` : ''}
                </div>
            `;
        }

        html += `</div>`;
        
        this.showModal(`📊 第${day}天 经营日报`, html);
    },

    showDailyReportHistory() {
        const state = GameState.getState();
        const reports = state.dailyReports || [];
        
        if (reports.length === 0) {
            this.showToast('暂无历史日报', 'info');
            return;
        }

        let html = '<div style="max-height: 500px; overflow-y: auto;">';
        html += '<p style="margin-bottom: 12px; color: var(--text-muted);">共 ' + reports.length + ' 份历史日报</p>';
        
        reports.slice().reverse().forEach(report => {
            const day = report.day;
            const summary = [];
            if (report.netChange) {
                summary.push(`食物${report.netChange.food >= 0 ? '+' : ''}${report.netChange.food}`);
                summary.push(`水${report.netChange.water >= 0 ? '+' : ''}${report.netChange.water}`);
            }
            if (report.casualties && report.casualties.totalDeaths > 0) {
                summary.push(`死亡${report.casualties.totalDeaths}人`);
            }
            if (report.repairs && report.repairs.length > 0) {
                summary.push(`${report.repairs.length}项维修`);
            }
            html += `
                <div style="padding: 10px; margin-bottom: 8px; background: var(--bg-dark); border-radius: 6px; cursor: pointer;"
                     onclick="UI.viewDailyReport(${day})">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong>第${day}天</strong>
                        <span style="font-size: 12px; color: var(--text-secondary);">
                            ${summary.join(' | ')}
                        </span>
                    </div>
                    ${report.moraleChange !== undefined ? `
                        <p style="margin-top: 4px; font-size: 12px;">
                            士气: ${report.moraleChange >= 0 ? '+' : ''}${report.moraleChange} (${report.morale}%)
                        </p>
                    ` : ''}
                </div>
            `;
        });
        
        html += '</div>';
        this.showModal('📊 历史经营日报', html);
    },

    viewDailyReport(day) {
        const report = GameState.getDailyReport(day);
        if (report) {
            this.showDailyReport(report);
        }
    },

    showLogModal() {
        const state = GameState.getState();
        let html = `
            <div style="margin-bottom: 12px;">
                <button class="btn" style="padding: 6px 12px; font-size: 12px;"
                        onclick="UI.showDailyReportHistory()">
                    📊 查看经营日报
                </button>
            </div>
            <div style="max-height: 360px; overflow-y: auto;">
        `;
        
        state.log.forEach(log => {
            const typeColor = log.type === 'success' ? 'var(--success)' : 
                             log.type === 'warning' ? 'var(--warning)' : 
                             log.type === 'danger' ? 'var(--danger)' : 'var(--text-secondary)';
            html += `<div class="event-log-item">
                <span class="date">第${log.day}天</span>
                <span style="color: ${typeColor};">${log.message}</span>
            </div>`;
        });
        
        html += '</div>';
        this.showModal('📜 日志记录', html);
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};
