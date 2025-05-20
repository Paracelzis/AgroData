$(function(){
    // Загружаем информацию о пользователе и настраиваем навигацию
    $.ajax({
        url: '/api/user-info',
        method: 'GET',
        success: function(data) {
            $("#nav-placeholder").load("/nav.html", function() {
                if (!data.isAdmin) {
                    $(".admin-section").remove();
                }
                if (data.username) {
                    $(".username-display").text(data.username);
                } else {
                    $(".user-section").hide();
                }
                highlightActiveNavItem();
            });
        },
        error: function(error) {
            console.error("Ошибка при получении информации о пользователе:", error);
            // В случае ошибки всё равно загружаем навигацию, но без административной части
            $("#nav-placeholder").load("/nav.html", function() {
                $(".admin-section").hide();
                highlightActiveNavItem();
            });
        }
    });
});

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
