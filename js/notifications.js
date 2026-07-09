/**
 * NotificationManager
 * Gerencia a lógica de SLA e exibe notificações no Hub estilo iOS.
 */
window.NotificationManager = {
  notifications: [],
  dismissedCache: null,
  previousNotifCount: 0,

  getDismissed: function() {
    if (this.dismissedCache) return this.dismissedCache;
    try {
      const stored = localStorage.getItem('pf_dismissed_notifs');
      this.dismissedCache = stored ? JSON.parse(stored) : [];
    } catch(e) {
      this.dismissedCache = [];
    }
    return this.dismissedCache;
  },

  saveDismissed: function(arr) {
    this.dismissedCache = arr;
    localStorage.setItem('pf_dismissed_notifs', JSON.stringify(arr));
  },

  dismissNotification: function(e, cardId, type) {
    e.stopPropagation();
    const itemEl = e.currentTarget.closest('.notif-item');
    if (itemEl) {
      itemEl.classList.add('dismissing');
      setTimeout(() => {
        const arr = this.getDismissed();
        const key = cardId + '_' + type;
        if (!arr.includes(key)) {
          arr.push(key);
          this.saveDismissed(arr);
        }
        this.checkSLA();
      }, 300); // tempo da animação CSS
    }
  },

  clearAllNotifications: function() {
    const arr = this.getDismissed();
    this.notifications.forEach(n => {
      const key = n.cardId + '_' + n.type;
      if (!arr.includes(key)) arr.push(key);
    });
    this.saveDismissed(arr);
    
    const list = document.getElementById('notif-hub-list');
    if (list) {
      const items = list.querySelectorAll('.notif-item');
      items.forEach(el => el.classList.add('dismissing'));
      setTimeout(() => {
        this.checkSLA();
      }, 300);
    } else {
      this.checkSLA();
    }
  },

  playPing: function() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1); // A6
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch(e) {
      console.log('Audio not supported or blocked');
    }
  },

  toggleHub: function(e) {
    if(e) e.stopPropagation();
    const overlay = document.getElementById('notif-hub-overlay');
    if (overlay) {
      overlay.classList.toggle('active');
    }
  },

  closeHub: function() {
    const overlay = document.getElementById('notif-hub-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  },

  checkSLA: function() {
    if (!window.PFBoard || !window.PFBoard.cards) return;
    
    this.notifications = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dismissed = this.getDismissed();

    window.PFBoard.cards.forEach(card => {
      if (card.bpmn === 'concluido' || card.bpmn_status === 'concluido') return;

      const dueDateStr = card.due_date || card.date;
      if (!dueDateStr) return;

      const dParts = dueDateStr.split('T')[0].split('-');
      if (dParts.length !== 3) return;

      const dueDate = new Date(dParts[0], dParts[1] - 1, dParts[2]);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let type = null;
      let message = '';
      
      if (diffDays < 0) {
        type = 'overdue';
        message = `Prazo ultrapassado em ${Math.abs(diffDays)} dia(s).`;
      } else if (diffDays <= 2) {
        type = 'critical';
        message = `Entrega iminente! Vence em ${diffDays} dia(s).`;
      } else if (diffDays <= 7) {
        type = 'warning';
        message = `Preparação: A tarefa vence em ${diffDays} dia(s).`;
      }

      if (type) {
        const key = card.id + '_' + type;
        if (!dismissed.includes(key)) {
          this.notifications.push({
            type: type,
            cardId: card.id,
            title: card.title,
            message: message,
            days: diffDays
          });
        }
      }
    });

    this.notifications.sort((a, b) => a.days - b.days);

    if (this.notifications.length > this.previousNotifCount) {
      this.playPing();
    }
    this.previousNotifCount = this.notifications.length;

    this.renderBadge();
    this.renderHub();
  },

  renderBadge: function() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    
    if (this.notifications.length > 0) {
      badge.textContent = this.notifications.length > 99 ? '99+' : this.notifications.length;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  },

  renderHub: function() {
    const list = document.getElementById('notif-hub-list');
    if (!list) return;

    if (this.notifications.length === 0) {
      list.innerHTML = `<div class="notif-empty">Tudo em dia! Nenhuma notificação pendente.</div>`;
      return;
    }

    list.innerHTML = '';
    this.notifications.forEach(n => {
      let icon = '';
      let iconClass = '';
      if (n.type === 'overdue') {
        iconClass = 'overdue';
        icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
      } else if (n.type === 'critical') {
        iconClass = 'critical';
        icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
      } else {
        iconClass = 'warning';
        icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
      }

      const item = document.createElement('div');
      item.className = 'notif-item';
      item.onclick = () => {
        this.closeHub();
        if (typeof window.openCardEdit === 'function') {
          window.openCardEdit(n.cardId);
        }
      };

      item.innerHTML = `
        <div class="notif-icon ${iconClass}">${icon}</div>
        <div class="notif-content">
          <div class="notif-title">${this.escapeHTML(n.title)}</div>
          <div class="notif-desc">${n.message}</div>
          <div class="notif-time">${n.type === 'overdue' ? 'Atrasado' : 'Pendente'}</div>
        </div>
        <div class="notif-item-close" onclick="window.NotificationManager.dismissNotification(event, '${n.cardId}', '${n.type}')" title="Marcar como lido">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </div>
      `;
      list.appendChild(item);
    });
  },

  escapeHTML: function(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
};
