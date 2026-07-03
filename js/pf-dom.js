/**
 * PROTOCOLO MYTHOS - PF.DOM (Motor Nativo)
 * Substitui o innerHTML vulnerável por uma interface DOM Virtual segura.
 * Nenhuma dependência externa.
 */

window.PFDOM = {
  /**
   * Hyperscript function para criar elementos DOM de forma segura.
   * @param {string} tag - Ex: 'div', 'button.btn-primary'
   * @param {object} props - Atributos HTML e eventos (ex: { id: 'x', onclick: fn })
   * @param  {...any} children - Texto puro (seguro) ou outros nós DOM.
   * @returns {HTMLElement}
   */
  h(tag, props = {}, ...children) {
    // Permite atalhos como 'div.card'
    const parts = tag.split('.');
    const el = document.createElement(parts[0]);
    
    if (parts.length > 1) {
      el.className = parts.slice(1).join(' ');
    }

    // Aplica propriedades e eventos
    for (const [key, value] of Object.entries(props || {})) {
      if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key === 'class' || key === 'className') {
        if (el.className) el.className += ' ' + value;
        else el.className = value;
      } else if (key === 'innerHTML') {
        // PERIGO: Só deve ser usado se explicitamente solicitado e validado (bypass).
        // Na refatoração MYTHOS, isso não deve ser invocado, mas fica para legado extremo.
        el.innerHTML = value;
      } else {
        if (value !== null && value !== undefined) {
            el.setAttribute(key, value);
        }
      }
    }

    // Adiciona filhos (se for string, vira TextNode seguro blindado contra XSS)
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      if (child instanceof Node) {
        el.appendChild(child);
      } else {
        el.appendChild(document.createTextNode(String(child)));
      }
    }

    return el;
  },

  /**
   * Helper para montar arrays de filhos num fragmento (útil para lists)
   */
  frag(children) {
    const f = document.createDocumentFragment();
    for (const child of children.flat()) {
      if (child instanceof Node) f.appendChild(child);
    }
    return f;
  },

  /**
   * State Proxy (Contêiner Reativo)
   */
  Store: {
    state: {},
    listeners: {},

    /**
     * @param {string} key - Chave do estado (ex: 'tasks')
     * @param {any} initialValue 
     */
    init(key, initialValue = null) {
      if (!(key in this.state)) {
        this.state[key] = initialValue;
      }
    },

    /**
     * @param {string} key 
     * @param {any} value 
     */
    set(key, value) {
      this.state[key] = value;
      this.notify(key);
    },

    get(key) {
      return this.state[key];
    },

    subscribe(key, callback) {
      if (!this.listeners[key]) this.listeners[key] = [];
      this.listeners[key].push(callback);
      // Retorna função de unsubscribe
      return () => {
        this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
      };
    },

    notify(key) {
      if (this.listeners[key]) {
        for (const cb of this.listeners[key]) {
          cb(this.state[key]);
        }
      }
    }
  }
};

// Atalho global opcional para agilidade
window.h = window.PFDOM.h;
