document.addEventListener('DOMContentLoaded', () => {
  if (typeof tinymce === 'undefined') return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  tinymce.init({
    selector: '#ce-desc',
    skin: isDark ? 'oxide-dark' : 'oxide',
    content_css: isDark ? 'dark' : 'default',
    menubar: false,
    paste_data_images: true,
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'help', 'wordcount'
    ],
    toolbar: 'removeformat | forecolor backcolor | bold italic underline | ' +
             'alignleft aligncenter alignright alignjustify | ' +
             'numlist bullist | link image table',
    content_style: `
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        background-color: ${isDark ? '#161615' : '#ffffff'};
        color: ${isDark ? '#f0f0ee' : '#24292f'};
      }
      p { margin-block-start: 0.5em; margin-block-end: 0.5em; }
    `,
    branding: false,
    height: 500,
    resize: 'both',
    language: 'pt_BR',
    language_url: 'js/tinymce-pt_BR.js',
    setup: function (editor) {
      editor.on('change', function () {
        editor.save();
      });
      // Monitor theme change
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'data-theme') {
            const newTheme = document.documentElement.getAttribute('data-theme');
            const newIsDark = newTheme === 'dark';
            // We can't change skin dynamically without reinit, but we can update editor background manually
            editor.getBody().style.backgroundColor = newIsDark ? '#161615' : '#ffffff';
            editor.getBody().style.color = newIsDark ? '#f0f0ee' : '#24292f';
          }
        });
      });
      observer.observe(document.documentElement, { attributes: true });
      editor.on('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          const ext = file.name.split('.').pop().toLowerCase();
          
          if (ext === 'txt' || ext === 'xml') {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = function(evt) {
              const text = evt.target.result;
              if (ext === 'xml') {
                const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                editor.insertContent('<pre style="background:#f6f8fa; padding:10px; border-radius:4px;"><code>' + escaped + '</code></pre><p><br></p>');
              } else {
                const paragraphs = text.split('\\n').map(p => '<p>' + p + '</p>').join('');
                editor.insertContent(paragraphs);
              }
            };
            reader.readAsText(file);
          } else if (ext === 'msg') {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = function(evt) {
              try {
                if (typeof MsgReader === 'undefined') {
                  throw new Error("MsgReader não está definido. Verifique a importação no index.html");
                }
                const msgReader = new MsgReader(evt.target.result);
                const msgData = msgReader.getFileData();
                const from = msgData.senderName ? msgData.senderName : (msgData.senderEmail || 'Desconhecido');
                const to = msgData.displayTo ? msgData.displayTo : '';
                const subject = msgData.subject ? msgData.subject : 'Sem Assunto';
                const body = msgData.body ? msgData.body.replace(/\\n/g, '<br>') : '';
                
                const html = `
                  <div style="border-left: 4px solid #1f6feb; padding-left: 10px; margin-bottom: 10px; background: #f6f8fa; color: #24292f; padding: 10px; border-radius: 4px;">
                    <strong>De:</strong> ${from}<br>
                    <strong>Para:</strong> ${to}<br>
                    <strong>Assunto:</strong> ${subject}
                  </div>
                  <div style="padding: 10px; background: #ffffff; color: #24292f; border: 1px solid #d0d7de; border-radius: 4px;">
                    ${body}
                  </div><p><br></p>
                `;
                editor.insertContent(html);
              } catch (err) {
                console.error("Erro ao ler arquivo .msg:", err);
                editor.insertContent('<p><em>Erro ao extrair conteúdo do e-mail.</em></p>');
              }
            };
            reader.readAsArrayBuffer(file);
          }
        }
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
