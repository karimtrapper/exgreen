/* Restore section links after layout and font loading without changing URL tags. */
(() => {
    function alignLinkedSection() {
        let id;
        try { id = decodeURIComponent(window.location.hash.slice(1)); }
        catch { return; }
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;

        const task = /^task-([1-3])$/.exec(id);
        if (task && target.classList.contains('collapsed')) {
            toggleTask(Number(task[1]));
        }
        const header = document.querySelector('header');
        target.style.scrollMarginTop = `${Math.ceil(header?.getBoundingClientRect().height || 0) + 16}px`;
        target.scrollIntoView({ behavior: 'instant', block: 'start' });
    }

    alignLinkedSection();
    window.addEventListener('hashchange', alignLinkedSection);
    window.addEventListener('load', () => {
        const hash = window.location.hash;
        const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
        fontsReady.then(() => {
            if (window.location.hash === hash) requestAnimationFrame(alignLinkedSection);
        });
    }, { once: true });
    document.addEventListener('click', event => {
        const link = event.target.closest('a[href^="#"]');
        if (link?.hash && link.hash === window.location.hash) alignLinkedSection();
    });
})();
