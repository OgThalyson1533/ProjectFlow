document.addEventListener('DOMContentLoaded', () => {
  if (typeof tinymce === 'undefined') return;

  tinymce.init({
    selector: '#ce-desc',
    skin: 'oxide-dark',
    content_css: 'dark',
    menubar: false,
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'help', 'wordcount'
    ],
    toolbar: 'undo redo | blocks | ' +
    'bold italic | alignleft aligncenter ' +
    'alignright alignjustify | bullist numlist outdent indent | ' +
    'image link code | removeformat',
    content_style: `
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        background-color: #1a1a1a;
        color: #e0e0e0;
      }
      p { margin-block-start: 0.5em; margin-block-end: 0.5em; }
    `,
    branding: false,
    height: 300,
    setup: function (editor) {
      editor.on('change', function () {
        editor.save();
      });
    },
    // Handler de upload de imagens integrado com o Supabase da Faze
    images_upload_handler: async function (blobInfo, progress) {
      return new Promise(async (resolve, reject) => {
        try {
          const cardId = window.PF && window.PF.activeCardId;
          if (!cardId || String(cardId).startsWith('temp_')) {
            reject('Para enviar imagens ou anexos, salve a tarefa primeiro.');
            return;
          }

          if (!window.uploadAnexo) {
            reject('Módulo de upload não disponível no momento.');
            return;
          }

          const file = blobInfo.blob();
          const result = await window.uploadAnexo(file, cardId);
          
          if (result && result.public_url) {
            if (window.refreshCardAttachments) {
              window.refreshCardAttachments(cardId);
            }
            resolve(result.public_url);
          } else {
            reject('Erro ao fazer upload. Nenhuma URL retornada.');
          }
        } catch (err) {
          console.error('Erro no upload via TinyMCE:', err);
          reject('Falha ao enviar arquivo: ' + err.message);
        }
      });
    }
  });
});
