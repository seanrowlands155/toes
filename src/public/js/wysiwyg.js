(function () {
  function initWysiwyg(textarea) {
    const wrapper = document.createElement('div');
    wrapper.className = 'wysiwyg-wrapper';
    const toolbar = document.createElement('div');
    toolbar.className = 'wysiwyg-toolbar';
    toolbar.innerHTML = `
      <button type="button" data-command="bold"><strong>B</strong></button>
      <button type="button" data-command="italic"><em>I</em></button>
      <button type="button" data-command="createLink">Link</button>
      <button type="button" data-command="insertUnorderedList">• List</button>
      <button type="button" data-command="formatBlock" data-value="h2">H2</button>
    `;
    const editor = document.createElement('div');
    editor.className = 'wysiwyg-editor wysiwyg';
    editor.contentEditable = 'true';
    editor.innerHTML = textarea.value;

    toolbar.addEventListener('click', (event) => {
      const target = event.target.closest('button[data-command]');
      if (!target) return;
      event.preventDefault();
      const command = target.getAttribute('data-command');
      const value = target.getAttribute('data-value');
      if (command === 'createLink') {
        const url = prompt('Enter link URL');
        if (url) document.execCommand(command, false, url);
        return;
      }
      document.execCommand(command, false, value || null);
    });

    editor.addEventListener('input', () => {
      textarea.value = editor.innerHTML;
    });

    textarea.style.display = 'none';
    textarea.parentNode?.insertBefore(wrapper, textarea);
    wrapper.appendChild(toolbar);
    wrapper.appendChild(editor);
    wrapper.appendChild(textarea);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('textarea[data-wysiwyg="true"]').forEach(initWysiwyg);
    if (window.adminEnhancements) {
      window.adminEnhancements.forEach((fn) => {
        try {
          fn();
        } catch (error) {
          console.error('Admin enhancement failed', error);
        }
      });
    }
  });
})();
