/**
 * NotificationManager
 * Gerencia a lógica de SLA e exibe notificações no Hub estilo iOS.
 */
window.NotificationManager = {
  notifications: [],

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
    // Zera as horas para comparar apenas os dias
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    window.PFBoard.cards.forEach(card => {
      // Ignora cartões concluídos
      if (card.bpmn === 'concluido' || card.bpmn_status === 'concluido') return;

      const dueDateStr = card.due_date || card.date;
      if (!dueDateStr) return;

      // Extrai apenas a parte da data caso venha com horas (YYYY-MM-DD)
      const dParts = dueDateStr.split('T')[0].split('-');
      if (dParts.length !== 3) return;

      const dueDate = new Date(dParts[0], dParts[1] - 1, dParts[2]);
      
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        this.notifications.push({
          type: 'overdue',
          cardId: card.id,
          title: card.title,
          message: `Prazo ultrapassado em ${Math.abs(diffDays)} dia(s).`,
          days: diffDays
        });
      } else if (diffDays <= 2) {
        this.notifications.push({
          type: 'critical',
          cardId: card.id,
          title: card.title,
          message: `Entrega iminente! Vence em ${diffDays} dia(s).`,
          days: diffDays
        });
      } else if (diffDays <= 7) {
        this.notifications.push({
          type: 'warning',
          cardId: card.id,
          title: card.title,
          message: `Preparação: A tarefa vence em ${diffDays} dia(s).`,
          days: diffDays
        });
      }
    });

    // Ordena: Overdue primeiro, depois Critical, depois Warning
    this.notifications.sort((a, b) => a.days - b.days);

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
