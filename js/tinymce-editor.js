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
             'numlist bullist | link image table | importexcel importmarkdown voicetotext recordaudio',
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

      // ==== Ícones Customizados ====
      editor.ui.registry.addIcon('mic', '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>');
      editor.ui.registry.addIcon('record', '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#d32f2f"/></svg>');
      editor.ui.registry.addIcon('stop-record', '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" fill="#d32f2f"/></svg>');
      editor.ui.registry.addIcon('md-file', '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 11H7.5v-3.5L5.7 13 4 10.5V14H2V6h2l3 3.5L10 6h2v8zm8 0h-2v-4h-2v4h-2l3 4 3-4z"/></svg>');
      editor.ui.registry.addIcon('excel-file', '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-2.83 13L9.2 11.23l-1.97 3.77H5.21l3.05-5.22L5.43 5h2.15l1.79 3.65L11.27 5h2.08l-2.93 4.88L13.5 15h-2.33z"/></svg>');

      // ==== Funções de Importação ====
      function handleExcelFile(file, ed) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
          const data = new Uint8Array(e.target.result);
          if(typeof XLSX === 'undefined') {
            window.showToast?.("Biblioteca XLSX (Excel) não carregada.", true) || alert("Biblioteca XLSX não carregada.");
            return;
          }
          const workbook = XLSX.read(data, {type: 'array'});
          let sheetName = workbook.SheetNames[0];
          
          if (workbook.SheetNames.length > 1) {
            let promptText = "Este arquivo tem várias abas. Qual deseja importar? (Digite o número)\\n";
            workbook.SheetNames.forEach((s, i) => { promptText += `${i+1}: ${s}\\n`; });
            const answer = prompt(promptText, "1");
            if (answer !== null) {
               const idx = parseInt(answer) - 1;
               if (idx >= 0 && idx < workbook.SheetNames.length) {
                  sheetName = workbook.SheetNames[idx];
               } else {
                  window.showToast?.("Aba inválida selecionada.", true) || alert("Aba inválida.");
                  return;
               }
            } else {
               return; // cancelado
            }
          }
          
          const htmlStr = XLSX.utils.sheet_to_html(workbook.Sheets[sheetName]);
          ed.insertContent(`<h4>Planilha: ${sheetName}</h4><div style="overflow-x:auto;">${htmlStr}</div><p><br></p>`);
          window.showToast?.("Planilha importada com sucesso!", false);
        };
        reader.readAsArrayBuffer(file);
      }

      function handleMarkdownFile(file, ed) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
          const text = e.target.result;
          if(typeof marked === 'undefined') {
            window.showToast?.("Biblioteca Marked (Markdown) não carregada.", true) || alert("Biblioteca Marked não carregada.");
            return;
          }
          const htmlStr = marked.parse(text);
          ed.insertContent(htmlStr + '<p><br></p>');
          window.showToast?.("Markdown importado com sucesso!", false);
        };
        reader.readAsText(file);
      }

      // ==== Botões Customizados ====
      editor.ui.registry.addButton('importexcel', {
        icon: 'excel-file',
        tooltip: 'Importar Excel (.xlsx)',
        onAction: function () {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.xlsx, .csv';
          input.onchange = function(e) { handleExcelFile(e.target.files[0], editor); };
          input.click();
        }
      });

      editor.ui.registry.addButton('importmarkdown', {
        icon: 'md-file',
        tooltip: 'Importar Markdown (.md)',
        onAction: function () {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.md';
          input.onchange = function(e) { handleMarkdownFile(e.target.files[0], editor); };
          input.click();
        }
      });

      let recognition = null;
      let isRecordingVoice = false;
      
      editor.ui.registry.addButton('voicetotext', {
        icon: 'mic',
        tooltip: 'Ditado por Voz',
        onAction: function (api) {
          if (isRecordingVoice) {
            if(recognition) recognition.stop();
            return;
          }
          
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (!SpeechRecognition) {
            window.showToast?.('Seu navegador não suporta reconhecimento de voz.', true) || alert('Não suportado');
            return;
          }
          
          recognition = new SpeechRecognition();
          recognition.lang = 'pt-BR';
          recognition.interimResults = true;
          recognition.continuous = true;
          
          recognition.onstart = function() {
            isRecordingVoice = true;
            api.setIcon('stop-record');
            window.showToast?.('Gravação iniciada. Pode falar...', false);
          };
          
          recognition.onresult = function(event) {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + ' ';
              }
            }
            if (finalTranscript) {
               editor.insertContent(finalTranscript);
            }
          };
          
          recognition.onend = function() {
            isRecordingVoice = false;
            api.setIcon('mic');
            window.showToast?.('Gravação finalizada.', false);
          };
          
          recognition.start();
        }
      });

      let mediaRecorder = null;
      let audioChunks = [];
      let isRecordingAudio = false;

      editor.ui.registry.addButton('recordaudio', {
        icon: 'record',
        tooltip: 'Gravar Áudio',
        onAction: function (api) {
          if (isRecordingAudio) {
            if(mediaRecorder) mediaRecorder.stop();
            return;
          }

          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
              mediaRecorder = new MediaRecorder(stream);
              mediaRecorder.start();
              isRecordingAudio = true;
              api.setIcon('stop-record');
              window.showToast?.('Gravando áudio...', false);

              mediaRecorder.addEventListener("dataavailable", event => {
                audioChunks.push(event.data);
              });

              mediaRecorder.addEventListener("stop", () => {
                isRecordingAudio = false;
                api.setIcon('record');
                window.showToast?.('Áudio finalizado e inserido.', false);
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioChunks = [];
                stream.getTracks().forEach(track => track.stop());
                
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = function() {
                  const base64data = reader.result;
                  const audioHtml = `<p><audio controls src="${base64data}"></audio></p><p><br></p>`;
                  editor.insertContent(audioHtml);
                }
              });
            })
            .catch(err => {
              console.error(err);
              window.showToast?.('Permissão de microfone negada.', true) || alert('Permissão negada');
            });
        }
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
          } else if (ext === 'xlsx' || ext === 'csv') {
            e.preventDefault();
            handleExcelFile(file, editor);
          } else if (ext === 'md') {
            e.preventDefault();
            handleMarkdownFile(file, editor);
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
