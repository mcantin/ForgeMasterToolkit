const SUBSTAT_OPTIONS = [
  { v: 'none', t: 'None' },
  { v: 'atk_speed', t: 'Attack Speed' },
  { v: 'blk_rate', t: 'Block %' },
  { v: 'crit_rate', t: 'Crit Chance %' },
  { v: 'crit_dmg', t: 'Crit Damage %' },
  { v: 'dmg', t: 'Damage %' },
  { v: 'double_rate', t: 'Double Chance %' },
  { v: 'hp_regen', t: 'Health Regen %' },
  { v: 'health', t: 'Health %' },
  { v: 'life_steal', t: 'Life Steal %' },
  { v: 'melee_dmg', t: 'Melee Damage %' },
  { v: 'ranged_dmg', t: 'Ranged Damage %' },
  { v: 'skill_cd', t: 'Skill Cooldown %' },
  { v: 'skill_dmg', t: 'Skill Damage %' }
];

const SUBSTAT_META = {
  atk_speed: { icon: 'acute', color: '234, 179, 8' },
  blk_rate: { icon: 'shield', color: '100, 116, 139' },
  crit_rate: { icon: 'my_location', color: '249, 115, 22' },
  crit_dmg: { icon: 'crisis_alert', color: '239, 68, 68' },
  dmg: { icon: 'destruction', color: '220, 38, 38' },
  double_rate: { icon: 'repeat', color: '139, 92, 246' },
  hp_regen: { icon: 'healing', color: '16, 185, 129' },
  health: { icon: 'health_cross', color: '236, 72, 153' },
  life_steal: { icon: 'skull', color: '168, 85, 247' },
  melee_dmg: { icon: 'gavel', color: '180, 83, 9' },
  ranged_dmg: { icon: 'explosion', color: '5, 150, 105' },
  skill_cd: { icon: 'hourglass_empty', color: '6, 182, 212' },
  skill_dmg: { icon: 'auto_awesome', color: '217, 70, 239' }
};

const SLOT_NAMES = ['head', 'chest', 'gloves', 'necklace', 'ring', 'weapon', 'boots', 'belt', 'mount', 'pet1', 'pet2', 'pet3', 'skill1', 'skill2', 'skill3'];

const SLOT_META = {
  head: { icon: 'crown' },
  chest: { icon: 'apparel' },
  gloves: { icon: 'front_hand' },
  necklace: { icon: 'diamond' },
  ring: { icon: 'trip_origin' },
  weapon: { icon: 'swords' },
  boots: { icon: 'footprint' },
  belt: { icon: 'link' },
  mount: { icon: 'cruelty_free' },
  pet1: { icon: 'pets' },
  pet2: { icon: 'pets' },
  pet3: { icon: 'pets' },
  skill1: { icon: 'bolt' },
  skill2: { icon: 'bolt' },
  skill3: { icon: 'bolt' }
};

const HEALTH_ONLY = ['head', 'chest', 'boots', 'belt'];
const DAMAGE_ONLY = SLOT_NAMES.filter((name) => !HEALTH_ONLY.includes(name));
const SLOT_LAYOUT = [
  [{ name: 'head' }, { name: 'chest' }, { name: 'gloves' }, { name: 'necklace' }, { name: 'ring' }],
  [{ name: 'weapon' }, { name: 'boots' }, { name: 'belt' }, { name: 'mount', span: 2 }],
  [{ name: null }, { name: 'pet1' }, { name: 'pet2' }, { name: 'pet3' }, { name: null }],
  [{ name: null }, { name: 'skill1' }, { name: 'skill2' }, { name: 'skill3' }, { name: null }]
];

let slotStates = [];
let storedData = null;
let isDirty = false;
let modalRoot = null;

function cap(value) {
  return typeof value === 'string' && value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
}

function getSlotLabel(slotName) {
  if (slotName.startsWith('pet')) return 'Pet';
  if (slotName.startsWith('skill')) return 'Skill';
  return cap(slotName);
}

function createDefaultSlotState() {
  return {
    hp: null,
    dmg: null,
    substats: {},
    weaponType: 'melee'
  };
}

function isDualInputSlot(slotName) {
  return slotName === 'mount' || slotName.startsWith('pet') || slotName.startsWith('skill');
}

function getSlotName(index) {
  return SLOT_NAMES[index] || `Slot ${index + 1}`;
}

function getSlotState(index) {
  if (!slotStates[index]) {
    slotStates[index] = createDefaultSlotState();
  }
  return slotStates[index];
}

function getSubstatLabel(key) {
  const found = SUBSTAT_OPTIONS.find((option) => option.v === key);
  return found ? found.t : key;
}

function createSelect(name, value) {
  const select = document.createElement('select');
  select.name = name;
  select.className = 'modal-input';
  select.value = value || 'none';
  SUBSTAT_OPTIONS.forEach((option) => {
    const opt = document.createElement('option');
    opt.value = option.v;
    opt.textContent = option.t;
    select.appendChild(opt);
  });
  select.value = value || 'none';
  return select;
}

function buildPillsContainer(initialSubstats, onUpdate) {
  const container = document.createElement('div');
  container.className = 'pills-container';

  const currentSubstats = { ...initialSubstats };
  let activeEditingKey = null;

  const keys = Object.keys(SUBSTAT_META);
  const pillElements = {};

  function updatePill(key) {
    const pill = pillElements[key];
    const meta = SUBSTAT_META[key];
    const value = currentSubstats[key];
    
    pill.className = 'stat-pill';
    pill.innerHTML = '';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'pill-icon material-symbols-outlined';
    iconSpan.textContent = meta.icon;
    pill.appendChild(iconSpan);

    const labelSpan = document.createElement('span');
    labelSpan.className = 'pill-label';

    if (activeEditingKey === key) {
      pill.classList.add('editing');
      labelSpan.textContent = getSubstatLabel(key) + ': ';
      pill.appendChild(labelSpan);

      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'pill-input';
      if (key === 'skill_cd') {
        input.max = '0';
      } else {
        input.min = '0';
      }
      input.step = 'any';
      input.value = value !== undefined && value !== null ? value : '';
      input.addEventListener('click', (e) => e.stopPropagation());
      
      const saveBtn = document.createElement('button');
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          saveBtn.click();
        }
      });
      input.addEventListener('input', () => {
        if (input.value === '') {
          delete currentSubstats[key];
        } else {
          let val = Number(input.value);
          if (key === 'skill_cd' && val > 0) {
            val = -val;
            input.value = val;
          }
          currentSubstats[key] = val;
        }
        onUpdate(currentSubstats);
      });
      pill.appendChild(input);

      const actions = document.createElement('div');
      actions.className = 'pill-actions';

      saveBtn.type = 'button';
      saveBtn.className = 'pill-action-btn pill-save-btn';
      saveBtn.innerHTML = '✔️';
      saveBtn.title = 'Save';
      saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (input.value === '') {
          delete currentSubstats[key];
        } else {
          currentSubstats[key] = Number(input.value);
        }
        activeEditingKey = null;
        onUpdate(currentSubstats);
        refreshAll();
      });

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'pill-action-btn pill-delete-btn';
      cancelBtn.innerHTML = '❌';
      cancelBtn.title = 'Cancel';
      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        delete currentSubstats[key];
        activeEditingKey = null;
        onUpdate(currentSubstats);
        refreshAll();
      });

      actions.append(saveBtn, cancelBtn);
      pill.appendChild(actions);

      setTimeout(() => input.focus(), 50);

    } else if (value !== undefined && value !== null) {
      pill.classList.add('saved');
      labelSpan.innerHTML = `${getSubstatLabel(key)}: <strong>${value}</strong>`;
      pill.appendChild(labelSpan);

      const actions = document.createElement('div');
      actions.className = 'pill-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'pill-action-btn pill-edit-btn';
      editBtn.innerHTML = '✏️';
      editBtn.title = 'Edit';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeEditingKey = key;
        refreshAll();
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'pill-action-btn pill-delete-btn';
      delBtn.innerHTML = '🗑️';
      delBtn.title = 'Delete';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        delete currentSubstats[key];
        if (activeEditingKey === key) activeEditingKey = null;
        onUpdate(currentSubstats);
        refreshAll();
      });

      actions.append(editBtn, delBtn);
      pill.appendChild(actions);

    } else {
      pill.classList.add('unselected');
      labelSpan.textContent = getSubstatLabel(key);
      pill.appendChild(labelSpan);
    }
  }

  function refreshAll() {
    keys.forEach((k) => {
      updatePill(k);
    });
  }

  keys.forEach((key) => {
    const meta = SUBSTAT_META[key];
    const pill = document.createElement('div');
    pill.style.setProperty('--pill-color-rgb', meta.color);
    pill.dataset.stat = key;

    pill.addEventListener('click', () => {
      if (activeEditingKey === key || (currentSubstats[key] !== undefined && activeEditingKey !== key && activeEditingKey === null)) {
        if (activeEditingKey === null) {
          activeEditingKey = key;
          refreshAll();
        }
        return;
      }
      activeEditingKey = key;
      refreshAll();
    });

    pillElements[key] = pill;
    container.appendChild(pill);
  });

  refreshAll();

  return container;
}

function buildSummaryList(index) {
  const slotName = getSlotName(index);
  const state = getSlotState(index);
  const list = document.createElement('div');
  list.className = 'slot-summary-list';

  const createSlotStatPill = (name, value, icon, color) => {
    const pill = document.createElement('div');
    pill.className = 'summary-total-pill slot-stat-pill';
    pill.style.setProperty('--pill-color-rgb', color);
    pill.style.marginBottom = '0.5rem';

    const left = document.createElement('div');
    left.className = 'pill-left';
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'pill-icon material-symbols-outlined';
    iconSpan.textContent = icon;
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    
    left.append(iconSpan, nameSpan);
    
    const right = document.createElement('div');
    right.className = 'pill-right';
    const parsed = parseFloat(value);
    right.textContent = isNaN(parsed) ? value : formatBigNumber(parsed);
    
    pill.append(left, right);
    return pill;
  };

  const subEntries = Object.entries(state.substats || {}).filter(([, val]) => val !== null && val !== undefined);
  const hasDmg = state.dmg !== null && state.dmg !== '';
  const hasHp = state.hp !== null && state.hp !== '';
  const hasSubstats = subEntries.length > 0;

  if (!hasDmg && !hasHp && !hasSubstats) {
    const empty = document.createElement('div');
    empty.className = 'slot-empty';
    empty.textContent = 'No value set';
    list.appendChild(empty);
    return list;
  }

  if (slotName === 'weapon') {
    const isMelee = state.weaponType === 'melee';
    const typeLabel = isMelee ? 'Melee' : 'Ranged';
    const typeIcon = isMelee ? SUBSTAT_META.melee_dmg.icon : SUBSTAT_META.ranged_dmg.icon;
    const typeColor = isMelee ? SUBSTAT_META.melee_dmg.color : SUBSTAT_META.ranged_dmg.color;
    list.appendChild(createSlotStatPill('Type', typeLabel, typeIcon, typeColor));
  }

  if (hasDmg) {
    list.appendChild(createSlotStatPill('Damage', state.dmg, 'destruction', '220, 38, 38'));
  }

  if (hasHp) {
    list.appendChild(createSlotStatPill('Health', state.hp, 'health_cross', '236, 72, 153'));
  }

  if (hasSubstats) {
    const pillsContainer = document.createElement('div');
    pillsContainer.className = 'slot-summary-pills';
    subEntries.forEach(([key, val]) => {
      const meta = SUBSTAT_META[key];
      if (!meta) return;
      const pill = createSlotStatPill(getSubstatLabel(key), val, meta.icon, meta.color);
      pillsContainer.appendChild(pill);
    });
    list.appendChild(pillsContainer);
  }

  return list;
}

function makeSlot(index) {
  const slotName = getSlotName(index);
  const wrapper = document.createElement('div');
  wrapper.className = 'slot';
  wrapper.dataset.slotIndex = String(index);

  const header = document.createElement('div');
  header.className = 'slot-header';

  const title = document.createElement('div');
  title.className = 'slot-title';
  const icon = SLOT_META[slotName]?.icon || 'settings';
  title.innerHTML = `<span class="slot-icon material-symbols-outlined">${icon}</span> ${getSlotLabel(slotName)}`;

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'icon-btn';
  editButton.innerHTML = '✎';
  editButton.title = `Edit ${getSlotLabel(slotName)}`;
  editButton.addEventListener('click', () => openModal(index));

  header.appendChild(title);
  header.appendChild(editButton);
  wrapper.appendChild(header);
  wrapper.appendChild(buildSummaryList(index));
  return wrapper;
}

function renderSlotLayout() {
  const slotsContainer = document.getElementById('slots');
  if (!slotsContainer) return;

  slotsContainer.innerHTML = '';

  SLOT_LAYOUT.forEach((row) => {
    row.forEach((cell) => {
      const cellElement = document.createElement('div');
      cellElement.className = 'slot-cell';
      if (cell.span) {
        cellElement.classList.add(`slot-cell--span-${cell.span}`);
      }

      if (!cell.name) {
        cellElement.classList.add('slot-cell--empty');
        cellElement.innerHTML = '<div class="slot slot--empty"></div>';
      } else {
        const slotIndex = SLOT_NAMES.indexOf(cell.name);
        if (slotIndex >= 0) {
          cellElement.appendChild(makeSlot(slotIndex));
        }
      }

      slotsContainer.appendChild(cellElement);
    });
  });

  highlightDiffs();
}

function showReadme() {
  window.location.href = 'help.html';
}

function init() {
  slotStates = SLOT_NAMES.map(() => createDefaultSlotState());
  renderSlotLayout();

  document.getElementById('store').addEventListener('click', storeData);
  document.getElementById('pull').addEventListener('click', pullFromStorage);
  document.getElementById('save').addEventListener('click', saveLocal);
  document.getElementById('load').addEventListener('click', () => {
    loadLocal();
    markDirty(true);
  });
  document.getElementById('reset').addEventListener('click', () => {
    resetForm();
    markDirty(true);
  });
  document.getElementById('readme').addEventListener('click', showReadme);
  document.getElementById('export').addEventListener('click', exportJson);

  const importFile = document.getElementById('import-file');
  document.getElementById('import').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', (event) => {
    importJson(event);
    markDirty(true);
  });

  renderStored();
}

function readForm() {
  return { slots: slotStates.map((slot) => ({ ...slot })) };
}

function computeTotalsFromSlots(slots) {
  const totals = { totalHp: 0, totalDmg: 0, substats: {} };

  (slots || []).forEach((slot, index) => {
    if (slot.substats) {
      Object.entries(slot.substats).forEach(([key, val]) => {
        if (key !== 'none' && val !== null && val !== undefined) {
          totals.substats[key] = (totals.substats[key] || 0) + val;
        }
      });
    }
  });

  (slots || []).forEach((slot, index) => {
    const name = SLOT_NAMES[index];
    if (name.startsWith('skill')) {
      const skillDmgMultiplier = 1 + (totals.substats.skill_dmg || 0) / 100;
      totals.totalDmg += (slot.dmg || 0) * skillDmgMultiplier;
      totals.totalHp += slot.hp || 0;
    } else {
      totals.totalHp += slot.hp || 0;
      totals.totalDmg += slot.dmg || 0;
    }
  });

  let weaponType = 'melee';
  const weaponSlot = slots[5];
  if (weaponSlot && weaponSlot.weaponType) weaponType = weaponSlot.weaponType;

  const meleeDmg = weaponType === 'melee' ? (totals.substats.melee_dmg || 0) : 0;
  const rangedDmg = weaponType === 'ranged' ? (totals.substats.ranged_dmg || 0) : 0;
  const dmgPercent = (totals.substats.dmg || 0) + meleeDmg + rangedDmg;

  const baseDamage = (totals.totalDmg || 0) * (1 + dmgPercent / 100);
  const atkSpeedFactor = 1 + (totals.substats.atk_speed || 0) / 100;
  const baseAttacksPerSec = 0.5;
  const doubleFactor = 1 + Math.min(100, totals.substats.double_rate || 0) / 100;

  const critRate = Math.min(100, totals.substats.crit_rate || 0) / 100;
  let critFactor = 1;
  if (critRate > 0) {
    const critDmgMultiplier = 1.2 + (totals.substats.crit_dmg || 0) / 100;
    critFactor = 1 + critRate * (critDmgMultiplier - 1);
  }

  const dps = baseDamage * baseAttacksPerSec * atkSpeedFactor * doubleFactor * critFactor;

  totals.totalHp = totals.totalHp * (1 + (totals.substats.health || 0) / 100);

  totals.dps = dps;
  return totals;
}

function getTotals() {
  const formData = readForm();
  return { formData, totals: computeTotalsFromSlots(formData.slots) };
}

// renderSubstats is now handled directly by renderStored as vertical summary pills

function setStatus(text, highlight = false) {
  const element = document.getElementById('store-status');
  if (!element) return;
  element.textContent = text;
  element.style.color = highlight ? '#0ea5a4' : '#64748b';
}

function markDirty(state = true) {
  isDirty = state;
  setStatus(isDirty ? 'Unsaved changes' : storedData ? 'Stored' : 'No stored data', !isDirty && !!storedData);
}

function getChangeColor(current, stored) {
  current = current || 0;
  stored = stored || 0;
  if (stored === 0) return '';
  const pct = ((current - stored) / stored) * 100;
  const clamped = Math.max(-10, Math.min(10, pct));
  if (clamped === 0) return '';

  if (clamped > 0) {
    const intensity = clamped / 10;
    const r = Math.round(255 - (255 - 74) * intensity);
    const g = Math.round(255 - (255 - 222) * intensity);
    const b = Math.round(255 - (255 - 128) * intensity);
    return `rgb(${r},${g},${b})`;
  }

  const intensity = -clamped / 10;
  const r = Math.round(255 - (255 - 248) * intensity);
  const g = Math.round(255 - (255 - 113) * intensity);
  const b = Math.round(255 - (255 - 113) * intensity);
  return `rgb(${r},${g},${b})`;
}

function highlightDiffs() {
  document.querySelectorAll('.slot').forEach((card) => card.classList.remove('slot--changed'));
  if (!storedData) return;

  slotStates.forEach((state, index) => {
    const card = document.querySelector(`.slot[data-slot-index="${index}"]`);
    if (!card) return;
    const stored = storedData.slots[index] || {};
    
    let storedSubstats = {};
    if (stored.substats) {
      storedSubstats = stored.substats;
    } else {
      if (stored.sub1 && stored.sub1 !== 'none' && stored.sub1v !== null && stored.sub1v !== undefined) {
        storedSubstats[stored.sub1] = stored.sub1v;
      }
      if (stored.sub2 && stored.sub2 !== 'none' && stored.sub2v !== null && stored.sub2v !== undefined) {
        storedSubstats[stored.sub2] = stored.sub2v;
      }
    }
    
    const changed = JSON.stringify([state.hp, state.dmg, state.substats || {}, state.weaponType]) !== JSON.stringify([stored.hp ?? null, stored.dmg ?? null, storedSubstats, stored.weaponType ?? 'melee']);
    if (changed) card.classList.add('slot--changed');
  });
}

const formatBigNumber = (num) => {
  const formatStr = (val) => parseFloat(val.toFixed(2));
  if (Math.abs(num) >= 1e15) return formatStr(num / 1e15) + 'q';
  if (Math.abs(num) >= 1e12) return formatStr(num / 1e12) + 't';
  if (Math.abs(num) >= 1e9) return formatStr(num / 1e9) + 'b';
  if (Math.abs(num) >= 1e6) return formatStr(num / 1e6) + 'm';
  if (Math.abs(num) >= 1e3) return formatStr(num / 1e3) + 'k';
  return formatStr(num).toString();
};

function renderStored() {
  const previewElement = document.getElementById('preview');
  const pillsList = document.getElementById('summary-pills-list');
  if (!pillsList) return;

  pillsList.innerHTML = '';

  const currentTotals = getTotals().totals;
  const baselineTotals = storedData ? (storedData.summary || computeTotalsFromSlots(storedData.slots)) : null;

  if (previewElement) {
    if (storedData) {
      previewElement.textContent = JSON.stringify({ summary: storedData.summary || baselineTotals, slots: storedData.slots }, null, 2);
    } else {
      previewElement.textContent = JSON.stringify({ summary: currentTotals, slots: slotStates }, null, 2);
    }
  }



  const formatComparison = (current, storedValue) => {
    current = current || 0;
    storedValue = storedValue || 0;
    if (storedValue === 0) return formatBigNumber(current);
    const pct = ((current - storedValue) / storedValue) * 100;
    if (Math.abs(pct) < 0.05) return formatBigNumber(current);
    const pctStr = pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
    return `${formatBigNumber(current)} (${pctStr})`;
  };

  const baseStats = [
    { key: 'health', name: 'Health', icon: 'health_cross', color: '236, 72, 153', current: currentTotals.totalHp, baseline: baselineTotals ? baselineTotals.totalHp : 0 },
    { key: 'damage', name: 'Damage', icon: 'destruction', color: '220, 38, 38', current: currentTotals.totalDmg, baseline: baselineTotals ? baselineTotals.totalDmg : 0 },
    { key: 'dps', name: 'DPS', icon: 'speed', color: '234, 179, 8', current: currentTotals.dps, baseline: baselineTotals ? baselineTotals.dps : 0 }
  ];

  let renderedAny = false;

  const createPill = (stat) => {
    if (stat.current === 0 && stat.baseline === 0) return null;
    renderedAny = true;
    const pill = document.createElement('div');
    pill.className = 'summary-total-pill';
    pill.style.setProperty('--pill-color-rgb', stat.color);

    const left = document.createElement('div');
    left.className = 'pill-left';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'pill-icon material-symbols-outlined';
    iconSpan.textContent = stat.icon;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = stat.name;

    left.append(iconSpan, nameSpan);

    const right = document.createElement('div');
    right.className = 'pill-right';

    if (storedData) {
      right.textContent = formatComparison(stat.current, stat.baseline);
      const changeColor = getChangeColor(stat.current, stat.baseline);
      if (changeColor) {
        right.style.backgroundColor = changeColor;
        right.style.color = '#000000';
      }
    } else {
      right.textContent = formatBigNumber(stat.current);
    }

    pill.append(left, right);
    return pill;
  };

  baseStats.forEach(stat => {
    const p = createPill(stat);
    if (p) pillsList.appendChild(p);
  });

  const columnsWrapper = document.createElement('div');
  columnsWrapper.className = 'summary-columns-wrapper';

  const col1 = document.createElement('div');
  col1.className = 'summary-column';
  
  const col2 = document.createElement('div');
  col2.className = 'summary-column';

  const col1Keys = ['hp_regen', 'life_steal', 'atk_speed', 'double_rate', 'skill_cd', 'crit_rate'];
  const col2Keys = ['health', 'dmg', 'ranged_dmg', 'melee_dmg', 'skill_dmg', 'crit_dmg', 'blk_rate'];

  const appendSubstatsToColumn = (keys, columnElement) => {
    keys.forEach(key => {
      const meta = SUBSTAT_META[key];
      if (!meta) return;
      const stat = {
        key: key,
        name: getSubstatLabel(key),
        icon: meta.icon,
        color: meta.color,
        current: currentTotals.substats[key] || 0,
        baseline: baselineTotals ? (baselineTotals.substats[key] || 0) : 0
      };
      const p = createPill(stat);
      if (p) columnElement.appendChild(p);
    });
  };

  appendSubstatsToColumn(col1Keys, col1);
  appendSubstatsToColumn(col2Keys, col2);

  columnsWrapper.appendChild(col1);
  columnsWrapper.appendChild(col2);
  pillsList.appendChild(columnsWrapper);

  if (!renderedAny) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No stats set on any equipment';
    pillsList.appendChild(empty);
  }

  markDirty(storedData === null);
  highlightDiffs();
}

function storeData() {
  storedData = readForm();
  storedData.summary = computeTotalsFromSlots(storedData.slots);
  renderStored();
}

function saveLocal() {
  if (!storedData) {
    alert('No stored JSON — press the Store button first');
    return;
  }
  localStorage.setItem('dps_builder', JSON.stringify(storedData));
}

function pullFromStorage() {
  if (!storedData) {
    alert('No stored data — press the Store button first');
    return;
  }
  pullFromStorageData(storedData);
  markDirty(false);
  renderStored();
}

function pullFromStorageData(data) {
  if (!data || !Array.isArray(data.slots)) return;
  slotStates = data.slots.map((slot) => {
    const hp = slot.hp === undefined || slot.hp === null ? null : slot.hp;
    const dmg = slot.dmg === undefined || slot.dmg === null ? null : slot.dmg;
    const weaponType = slot.weaponType || 'melee';
    
    let substats = {};
    if (slot.substats) {
      substats = { ...slot.substats };
    } else {
      if (slot.sub1 && slot.sub1 !== 'none' && slot.sub1v !== null && slot.sub1v !== undefined) {
        substats[slot.sub1] = slot.sub1v;
      }
      if (slot.sub2 && slot.sub2 !== 'none' && slot.sub2v !== null && slot.sub2v !== undefined) {
        substats[slot.sub2] = slot.sub2v;
      }
    }
    
    return { hp, dmg, substats, weaponType };
  });
  renderSlotLayout();
}

function loadLocal() {
  const raw = localStorage.getItem('dps_builder');
  if (!raw) {
    alert('No saved data');
    return;
  }
  const object = JSON.parse(raw);
  pullFromStorageData(object);
  storedData = object;
  markDirty(false);
  renderStored();
}

function exportJson() {
  if (!storedData) {
    alert('No stored JSON — press the Store button first');
    return;
  }
  const blob = new Blob([JSON.stringify(storedData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'dps_builder.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    alert('No file selected');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const object = JSON.parse(reader.result);
      if (!object || !Array.isArray(object.slots)) {
        alert('Invalid JSON format: expected { slots: [...] }');
        return;
      }
      pullFromStorageData(object);
      if (object.summary) {
        storedData = object;
        renderStored();
      } else {
        storedData = object;
        renderStored();
      }
      event.target.value = '';
    } catch (error) {
      alert(`Error parsing JSON: ${error.message}`);
    }
  };
  reader.readAsText(file);
}

function resetForm() {
  if (!confirm('Reset all values to 0?')) return;
  slotStates = SLOT_NAMES.map(() => createDefaultSlotState());
  storedData = null;
  renderSlotLayout();
  renderStored();
}

function closeModal() {
  if (modalRoot) {
    modalRoot.remove();
    modalRoot = null;
  }
}

function getSuffixMultiplier(suffix) {
  switch (suffix) {
    case 'q': return 1e15;
    case 't': return 1e12;
    case 'b': return 1e9;
    case 'm': return 1e6;
    case 'k': return 1e3;
    default: return 1;
  }
}

function parseBigNumberForInput(val) {
  let num = parseFloat(val);
  if (isNaN(num) || num === 0) return { val: val === null ? '' : val.toString(), suffix: '' };
  
  if (Math.abs(num) >= 1e15) return { val: parseFloat((num / 1e15).toFixed(2)).toString(), suffix: 'q' };
  if (Math.abs(num) >= 1e12) return { val: parseFloat((num / 1e12).toFixed(2)).toString(), suffix: 't' };
  if (Math.abs(num) >= 1e9) return { val: parseFloat((num / 1e9).toFixed(2)).toString(), suffix: 'b' };
  if (Math.abs(num) >= 1e6) return { val: parseFloat((num / 1e6).toFixed(2)).toString(), suffix: 'm' };
  if (Math.abs(num) >= 1e3) return { val: parseFloat((num / 1e3).toFixed(2)).toString(), suffix: 'k' };
  
  return { val: parseFloat(num.toFixed(2)).toString(), suffix: '' };
}

function buildNumberInputWithSuffixes(labelText, fieldName, initialValue, index) {
  const group = document.createElement('div');
  group.className = 'form-group';
  
  const label = document.createElement('label');
  label.textContent = labelText;
  label.setAttribute('for', `${fieldName}-${index}`);
  
  const inputRow = document.createElement('div');
  inputRow.className = 'input-with-suffixes';
  
  const input = document.createElement('input');
  input.id = `${fieldName}-${index}`;
  input.type = 'number';
  input.min = '0';
  input.step = '0.01';
  input.className = 'modal-input';
  
  const parsed = parseBigNumberForInput(initialValue);
  input.value = parsed.val;
  input.dataset.field = fieldName;
  input.dataset.suffix = parsed.suffix;
  
  inputRow.appendChild(input);
  
  const suffixGroup = document.createElement('div');
  suffixGroup.className = 'suffix-buttons';
  
  let currentSuffix = parsed.suffix;
  
  const suffixColors = { '': 'gray', 'k': 'blue', 'm': 'green', 'b': 'yellow', 't': 'red', 'q': 'purple' };
  
  ['', 'k', 'm', 'b', 't', 'q'].forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = s === '' ? '1' : s.toUpperCase();
    btn.className = `suffix-btn ${currentSuffix === s ? 'active' : ''}`;
    btn.dataset.color = suffixColors[s];
    btn.onclick = () => {
      suffixGroup.querySelectorAll('.suffix-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      input.dataset.suffix = s;
    };
    suffixGroup.appendChild(btn);
  });
  
  inputRow.appendChild(suffixGroup);
  group.append(label, inputRow);
  
  return group;
}

function buildModalEditor(index) {
  const slotName = getSlotName(index);
  const state = getSlotState(index);
  const wrapper = document.createElement('div');
  wrapper.className = 'modal-body';

  const title = document.createElement('h3');
  const icon = SLOT_META[slotName]?.icon || 'settings';
  title.innerHTML = `<span class="slot-icon material-symbols-outlined">${icon}</span> Edit ${getSlotLabel(slotName)}`;
  wrapper.appendChild(title);

  const form = document.createElement('form');
  form.className = 'modal-form';

  const fieldGrid = document.createElement('div');
  fieldGrid.className = 'modal-field-grid';

  const showHp = isDualInputSlot(slotName) || HEALTH_ONLY.includes(slotName) || slotName === 'weapon';
  const showDmg = isDualInputSlot(slotName) || !HEALTH_ONLY.includes(slotName) || slotName === 'weapon';

  if (showHp) {
    fieldGrid.appendChild(buildNumberInputWithSuffixes('Health', 'hp', state.hp, index));
  }

  if (showDmg) {
    fieldGrid.appendChild(buildNumberInputWithSuffixes('Damage', 'dmg', state.dmg, index));
  }

  if (slotName === 'weapon') {
    const typeGroup = document.createElement('div');
    typeGroup.className = 'form-group';
    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Weapon Type';
    const typeOptions = document.createElement('div');
    typeOptions.className = 'radio-group';

    ['melee', 'ranged'].forEach((value) => {
      const option = document.createElement('label');
      option.className = 'radio-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `weapon-type-${index}`;
      input.value = value;
      input.checked = state.weaponType === value;
      input.dataset.field = 'weaponType';
      const span = document.createElement('span');
      span.textContent = cap(value);
      option.append(input, span);
      typeOptions.appendChild(option);
    });
    typeGroup.append(typeLabel, typeOptions);
    fieldGrid.appendChild(typeGroup);
  }

  if (!slotName.startsWith('skill')) {
    const substatsGroup = document.createElement('div');
    substatsGroup.className = 'form-group';
    const substatsLabel = document.createElement('label');
    substatsLabel.textContent = 'Substats';

    const hiddenSubstats = document.createElement('input');
    hiddenSubstats.type = 'hidden';
    hiddenSubstats.dataset.field = 'substats';
    hiddenSubstats.value = JSON.stringify(state.substats || {});

    const pills = buildPillsContainer(state.substats || {}, (updatedSubstats) => {
      hiddenSubstats.value = JSON.stringify(updatedSubstats);
    });

    substatsGroup.append(substatsLabel, hiddenSubstats, pills);
    fieldGrid.appendChild(substatsGroup);
  }

  form.appendChild(fieldGrid);

  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.textContent = 'Save';
  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'secondary-btn';
  cancelButton.textContent = 'Cancel';
  cancelButton.addEventListener('click', closeModal);
  actions.append(saveButton, cancelButton);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const nextState = { ...getSlotState(index) };
    
    const hpEl = form.querySelector('[data-field="hp"]');
    if (hpEl) {
      if (hpEl.value === '') nextState.hp = null;
      else nextState.hp = Number(hpEl.value) * getSuffixMultiplier(hpEl.dataset.suffix || '');
    } else {
      nextState.hp = null;
    }

    const dmgEl = form.querySelector('[data-field="dmg"]');
    if (dmgEl) {
      if (dmgEl.value === '') nextState.dmg = null;
      else nextState.dmg = Number(dmgEl.value) * getSuffixMultiplier(dmgEl.dataset.suffix || '');
    } else {
      nextState.dmg = null;
    }

    nextState.substats = form.querySelector('[data-field="substats"]') ? JSON.parse(form.querySelector('[data-field="substats"]').value) : {};
    const weaponField = form.querySelector('input[name="weapon-type-' + index + '"]:checked');
    nextState.weaponType = weaponField ? weaponField.value : 'melee';
    slotStates[index] = nextState;
    markDirty(true);
    renderSlotLayout();
    renderStored();
    closeModal();
  });

  form.appendChild(actions);
  wrapper.appendChild(form);
  return wrapper;
}

function openModal(index) {
  closeModal();
  modalRoot = document.createElement('div');
  modalRoot.className = 'modal-backdrop';
  modalRoot.addEventListener('click', (event) => {
    if (event.target === modalRoot) closeModal();
  });

  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog';
  dialog.appendChild(buildModalEditor(index));
  modalRoot.appendChild(dialog);
  document.body.appendChild(modalRoot);
}

document.addEventListener('DOMContentLoaded', init);