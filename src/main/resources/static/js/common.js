function highlightActiveNavItem() {
    var url = window.location.href.split('#')[0];
    var links = document.querySelectorAll('.nav-item a');
    links.forEach(function(link) {
        if (link.href === url) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}