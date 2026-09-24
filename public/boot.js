// Fallback de carregamento — se o React não montar, mostra o motivo na tela
// em vez de deixar tela preta. Arquivo externo (CSP não permite inline).
(function () {
  var fb = document.getElementById('fallback-boot');
  if (!fb) return;
  var msg = document.getElementById('boot-msg');
  var btn = document.getElementById('boot-btn');
  var erro = document.getElementById('boot-erro');
  function mostra(texto, comBotao, textoErro) {
    if (msg) msg.textContent = texto;
    if (btn && comBotao) btn.style.display = 'block';
    if (erro && textoErro) erro.textContent = textoErro;
  }
  function recarrega() { location.reload(); }
  if (btn) btn.addEventListener('click', recarrega);

  // Navegador sem suporte a ES modules = muito antigo, avisa direto
  if (!('noModule' in HTMLScriptElement.prototype)) {
    mostra('Seu navegador está muito antigo para este site. Atualize o Chrome e tente de novo.', true);
    return;
  }

  // 8s sem React montado = rede lenta ou script travado
  setTimeout(function () {
    var root = document.getElementById('root');
    if (!root || !root.innerHTML) {
      mostra('A conexão está lenta. Se o site não abrir em 1 minuto, toque em "Tentar de novo".', true);
    } else if (fb.parentNode) {
      fb.remove();
    }
  }, 8000);

  // Erro de JS antes do React montar = mostra a mensagem do erro
  window.addEventListener('error', function (e) {
    var root = document.getElementById('root');
    if (root && !root.innerHTML) {
      mostra('Erro ao carregar o site:', true, (e && e.message ? e.message : 'Erro desconhecido') + ' — limpe o cache (Ctrl+Shift+R)');
    }
  });
})();
