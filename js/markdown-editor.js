import 'https://esm.sh/@github/tab-container-element';
import 'https://esm.sh/@github/markdown-toolbar-element';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.md-editor-container');
  const textarea = document.getElementById('ce-desc');
  const previewPanel = document.querySelector('.md-tabpanel-preview');

  if (!container || !textarea || !previewPanel) return;

  // Handle Tab changes for preview
  container.addEventListener('tab-container-changed', (event) => {
    const selectedTab = event.detail.relatedTarget;
    if (selectedTab.textContent.trim() === 'Preview') {
      const mdContent = textarea.value;
      if (mdContent.trim() === '') {
        previewPanel.innerHTML = '<div style="color:var(--tx-3);font-style:italic;">Nada para visualizar.</div>';
      } else {
        // use marked
        if (window.marked) {
          previewPanel.innerHTML = window.marked.parse(mdContent);
        } else {
          previewPanel.innerHTML = '<i>Carregando renderizador...</i>';
        }
      }
    }
  });

  // Helper: insert text at cursor
  function insertAtCursor(myField, myValue) {
    if (myField.selectionStart || myField.selectionStart === 0) {
      var startPos = myField.selectionStart;
      var endPos = myField.selectionEnd;
      myField.value = myField.value.substring(0, startPos)
        + myValue
        + myField.value.substring(endPos, myField.value.length);
      myField.selectionStart = startPos + myValue.length;
      myField.selectionEnd = startPos + myValue.length;
    } else {
      myField.value += myValue;
    }
    // trigger input event so external listeners know it changed
    myField.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Handle Upload
  async function handleFileUpload(file) {
    // Check if task exists and is not a temp task
    const cardId = window.PF && window.PF.activeCardId;
    if (!cardId || String(cardId).startsWith('temp_')) {
      alert('Para enviar imagens ou anexos, salve a tarefa primeiro.');
      return;
    }

    if (!window.uploadAnexo) {
      alert('Módulo de upload não disponível no momento.');
      return;
    }

    // Insert loading placeholder
    const placeholder = `![Enviando ${file.name}...]()\n`;
    insertAtCursor(textarea, placeholder);

    try {
      const result = await window.uploadAnexo(file, cardId);
      if (result && result.public_url) {
        // Determine if it is an image
        const isImage = file.type.startsWith('image/');
        const markdownLink = isImage 
          ? `![${file.name}](${result.public_url})` 
          : `[${file.name}](${result.public_url})`;

        textarea.value = textarea.value.replace(placeholder, markdownLink + '\n');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (err) {
      console.error('Erro no upload via Markdown:', err);
      textarea.value = textarea.value.replace(placeholder, '');
      alert('Falha ao enviar arquivo: ' + err.message);
    }
  }

  // Paste Event
  textarea.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let index in items) {
      const item = items[index];
      if (item.kind === 'file') {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          handleFileUpload(blob);
        }
      }
    }
  });

  // Drag and Drop Events
  textarea.addEventListener('dragover', (e) => {
    e.preventDefault();
    textarea.style.background = 'rgba(255,255,255,0.05)';
  });
  
  textarea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    textarea.style.background = 'transparent';
  });

  textarea.addEventListener('drop', (e) => {
    e.preventDefault();
    textarea.style.background = 'transparent';
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    }
  });

  const fileInput = document.getElementById('ce-desc-file');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
        // Reset input so the same file can be uploaded again if needed
        e.target.value = '';
      }
    });
  }

});
