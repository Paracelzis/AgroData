let currentPage = 0;
let pageSize = 10; // По умолчанию 10 записей на странице
let totalPages = 0;
let totalElements = 0;
let table;
let selectedRecordId = null;
let selectedFieldId = null;
let selectedSensorId = null;
let stompClient = null;
let currentSubscription = null;

// Объект для хранения параметров при редактировании
let editingParams = {};
let originalParams = {}; // Исходная копия параметров для восстановления при отмене
let editingParamKey = null; // Для режима редактирования параметра

$(document).ready(function() {
    // Настройка Bootstrap для работы с вложенными модальными окнами
    $(document).on('show.bs.modal', '.modal', function() {
        const zIndex = 1040 + 10 * $('.modal:visible').length;
        $(this).css('z-index', zIndex);
        setTimeout(() => {
            $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
        }, 0);
    });

    // Исправление для вложенных модальных окон
    $(document).on('hidden.bs.modal', '.modal', function() {
        $('.modal:visible').length && $('body').addClass('modal-open');
        if ($('.modal:visible').length > 0) {
            // Если есть другие открытые модальные окна, оставляем фон
            setTimeout(() => {
                // Удаляем только последний фон
                const modalBackdrops = $('.modal-backdrop');
                if (modalBackdrops.length > 1) {
                    modalBackdrops.last().remove();
                }
            }, 100);
        }
    });

    // Инициализация обработчиков для редактирования параметров
    // Обработчик кнопки редактирования параметров в модальном окне редактирования записи
    $('#edit-params-btn').on('click', function() {
        showEditParamsModal();
    });

    // Обработчик для кнопки добавления/обновления параметра
    $('#add-param-btn').on('click', function() {
        if (editingParamKey === null) {
            // Режим добавления
            addExtraParam();
        } else {
            // Режим обновления
            updateExtraParam();
        }
    });

    // Обработчик для сохранения параметров из модального окна
    $('#save-extra-params').on('click', function() {
        // Отмечаем, что используется метод сохранения
        $(this).addClass('active');

        // Сохраняем текущие параметры как оригинальные
        originalParams = JSON.parse(JSON.stringify(editingParams));

        // Закрываем модальное окно
        $('#editParamsModal').modal('hide');
        $('.temp-backdrop').remove(); // Удаляем временный бэкдроп

        // Сбрасываем состояние активности после небольшой задержки
        setTimeout(() => {
            $(this).removeClass('active');
        }, 100);
    });

    // Обработчик для отмены изменений (кнопка "Закрыть")
    $('#close-extra-params').on('click', function() {
        // Восстанавливаем исходные параметры
        resetEditingParams();
        clearParamInputFields();
        $('#editParamsModal').modal('hide');
        $('.temp-backdrop').remove(); // Удаляем временный бэкдроп
    });

    // Обработчик закрытия модального окна (любым способом)
    $('#editParamsModal').on('hidden.bs.modal', function() {
        // Восстанавливаем исходные параметры только при закрытии без сохранения
        // Проверка на существование активного метода очистки
        if (!document.getElementById('save-extra-params').classList.contains('active')) {
            resetEditingParams();
        }

        clearParamInputFields();
        editingParamKey = null; // Сбрасываем режим редактирования
        $('#add-param-btn').text('+'); // Возвращаем кнопке исходный текст
        $('.temp-backdrop').remove(); // Удаляем временный бэкдроп

        // Возвращаем фокус на кнопку в первом модальном окне
        setTimeout(() => {
            if ($('#editRecordModal').is(':visible')) {
                $('#edit-params-btn').focus();
            }
        }, 100);
    });

    // Добавляем обработчик изменения выбранного поля
    $('#field-select').on('change', function() {
        fetchFieldData();
    });

    initDataTable();
    connectWebSocket(); // fetchFields будет вызван после успешного подключения

    // Добавляем обработчик для изменения количества записей на странице
    $('#field-data-table_length select').on('change', function() {
        pageSize = parseInt($(this).val());
        currentPage = 0; // Сбрасываем на первую страницу при изменении размера
        fetchFieldData();
    });
});

// Функция для сброса изменений параметров к исходным
function resetEditingParams() {
    // Восстанавливаем исходные параметры
    editingParams = JSON.parse(JSON.stringify(originalParams));
}

$(function(){
    $("#nav-placeholder").load("/nav.html", function() {
        highlightActiveNavItem();
    });
});

function initDataTable() {
    table = $('#field-data-table').DataTable({
        paging: true,
        pageLength: 10,
        lengthMenu: [10, 15, 50, 100],
        searching: true,
        ordering: true,
        processing: true,
        // Отключаем встроенную пагинацию DataTables - мы будем управлять ей вручную
        serverSide: false,
        ajax: null,
        language: {
            processing: "Подождите...",
            search: "Поиск:",
            lengthMenu: "Показать _MENU_ записей",
            info: "Записи с _START_ до _END_ из _TOTAL_ записей",
            infoEmpty: "Записи с 0 до 0 из 0 записей",
            infoFiltered: "(отфильтровано из _MAX_ записей)",
            infoPostFix: "",
            loadingRecords: "Загрузка записей...",
            zeroRecords: "Записи отсутствуют.",
            emptyTable: "В таблице отсутствуют данные",
            paginate: {
                first: "Первая",
                previous: "Предыдущая",
                next: "Следующая",
                last: "Последняя"
            },
            aria: {
                sortAscending: ": активировать для сортировки столбца по возрастанию",
                sortDescending: ": активировать для сортировки столбца по убыванию"
            }
        },
        columns: [
            { data: 'sensorId' }, // ID датчика
            { data: 'uniqueIndex' }, // Уникальный индекс
            { data: 'value' }, // Значение
            { data: 'unit' }, // Единицы измерения
            { data: 'accuracyClass', defaultContent: '-' }, // Класс точности
            { data: 'extraParams', defaultContent: '-' }, // Доп. параметры
            {
                data: 'timestamp',
                render: function(data, type, row) {
                    if (type === 'sort') {
                        return data.sort;
                    }
                    return data.display;
                }
            },
            { data: 'actions', orderable: false }
        ],
        order: [[6, 'desc']], // Сортировка по дате (индекс 6)
        drawCallback: function(settings) {
            // Отложенная инициализация обработчика изменения количества записей
            setTimeout(() => {
                if (!window.pageSizeListenerInitialized) {
                    $('#field-data-table_length select').on('change', function() {
                        pageSize = parseInt($(this).val());
                        currentPage = 0; // Сбрасываем на первую страницу при изменении размера
                        fetchFieldData();
                    });
                    window.pageSizeListenerInitialized = true;
                }
            }, 100);
        }
    });

    // Добавляем контейнер для нашей кастомной пагинации под таблицей
    $('.table-container').append('<div id="custom-pagination" class="custom-pagination"></div>');
}

function updatePagination() {
    const paginationContainer = $('#custom-pagination');
    paginationContainer.empty();

    if (totalPages <= 1) {
        return; // Не показываем пагинацию, если всего одна страница
    }

    // Создаем кнопки пагинации
    const paginationEl = $('<ul class="pagination justify-content-center"></ul>');

    // Кнопка "Предыдущая"
    const prevButton = $(`<li class="page-item ${currentPage === 0 ? 'disabled' : ''}">
                          <a class="page-link" href="#" aria-label="Previous" data-page="${currentPage - 1}">
                            <span aria-hidden="true">&laquo;</span>
                          </a>
                        </li>`);
    paginationEl.append(prevButton);

    // Определяем, какие страницы показывать
    // Всегда показываем первую, последнюю и 3 страницы вокруг текущей
    const pagesToShow = new Set();
    pagesToShow.add(0); // Первая страница
    pagesToShow.add(totalPages - 1); // Последняя страница

    // 3 страницы вокруг текущей
    for (let i = Math.max(0, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pagesToShow.add(i);
    }

    // Преобразуем в массив и сортируем
    const pagesArray = Array.from(pagesToShow).sort((a, b) => a - b);

    // Добавляем кнопки страниц с разделителями
    let prevPage = -1;
    for (const page of pagesArray) {
        // Добавляем разделитель, если есть пропуск в нумерации
        if (prevPage !== -1 && page > prevPage + 1) {
            paginationEl.append('<li class="page-item disabled"><a class="page-link">...</a></li>');
        }

        // Добавляем кнопку страницы
        const pageButton = $(`<li class="page-item ${page === currentPage ? 'active' : ''}">
                              <a class="page-link" href="#" data-page="${page}">${page + 1}</a>
                            </li>`);
        paginationEl.append(pageButton);

        prevPage = page;
    }

    // Кнопка "Следующая"
    const nextButton = $(`<li class="page-item ${currentPage >= totalPages - 1 ? 'disabled' : ''}">
                          <a class="page-link" href="#" aria-label="Next" data-page="${currentPage + 1}">
                            <span aria-hidden="true">&raquo;</span>
                          </a>
                        </li>`);
    paginationEl.append(nextButton);

    // Добавляем пагинацию в контейнер
    paginationContainer.append(paginationEl);

    // Добавляем обработчики для кнопок
    $('.page-link').on('click', function(e) {
        e.preventDefault();

        // Проверяем, не отключена ли кнопка
        if ($(this).parent().hasClass('disabled')) {
            return;
        }

        const page = parseInt($(this).data('page'));
        if (!isNaN(page) && page >= 0 && page < totalPages) {
            currentPage = page;
            fetchFieldData();
        }
    });

    // Добавляем информацию о пагинации
    paginationContainer.append(`
        <div class="mt-2 text-center">
            Показаны записи ${Math.min(totalElements, currentPage * pageSize + 1)} -
            ${Math.min(totalElements, (currentPage + 1) * pageSize)} из ${totalElements}
        </div>
    `);
}

function connectWebSocket() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);

    stompClient.connect({}, function(frame) {
        console.log('Connected to WebSocket: ' + frame);
        fetchFields();
        if (selectedFieldId) {
            subscribeToFieldUpdates(selectedFieldId);
        }
    }, function(error) {
        console.error('WebSocket connection error: ', error);
        // Показываем уведомление пользователю
        alert('Не удалось подключиться к WebSocket. Попробуем переподключиться через 5 секунд...');
        setTimeout(connectWebSocket, 5000);
    });

    // Добавляем обработчик закрытия соединения
    socket.onclose = function(event) {
        console.warn('WebSocket connection closed:', event);
        setTimeout(connectWebSocket, 5000);
    };
}

function fetchFields() {
    fetch('/fields')
        .then(response => response.json())
        .then(data => {
            data.sort((a, b) => a.fieldName.localeCompare(b.fieldName));
            console.log('Fields fetched:', data);

            const fieldSelect = document.getElementById('field-select');
            fieldSelect.innerHTML = '';

            // Проверка на дубликаты названий полей
            const fieldNameCount = {};
            data.forEach(field => {
                const name = field.fieldName;
                fieldNameCount[name] = (fieldNameCount[name] || 0) + 1;
            });

            // Добавляем опцию "Выберите поле"
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- Выберите поле --';
            fieldSelect.appendChild(defaultOption);

            data.forEach(field => {
                const option = document.createElement('option');
                option.value = field.id;

                // Формируем отображаемое название поля с ID для всех полей
                const shortId = field.id.substring(0, 8); // Первые 8 символов ID
                option.textContent = `${field.fieldName} (ID: ${shortId})`;

                fieldSelect.appendChild(option);
            });

            // Не загружаем данные автоматически, ждем выбора поля пользователем
        })
        .catch(error => {
            console.error('Error fetching fields:', error);
            // Добавляем сообщение об ошибке для пользователя
            alert('Не удалось загрузить список полей. Пожалуйста, проверьте соединение с сервером.');
        });
}

function fetchFieldData() {
    selectedFieldId = document.getElementById('field-select').value;

    // Если поле не выбрано, очищаем таблицу и выходим
    if (!selectedFieldId) {
        table.clear().draw();
        $('#custom-pagination').empty();
        return;
    }

    // Показываем индикатор загрузки
    table.clear().draw();
    $('#custom-pagination').html('<div class="text-center"><div class="spinner-border" role="status"><span class="sr-only">Загрузка...</span></div></div>');

    // Загружаем данные для текущей страницы вместе с информацией о пагинации
    fetch(`/sensorData/field/${selectedFieldId}?page=${currentPage}&size=${pageSize}`)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        return response.json();
    })
    .then(responseData => {
        console.log('Received data:', responseData);

        // Обрабатываем возвращенную информацию о пагинации
        if (responseData.totalPages !== undefined) {
            totalPages = responseData.totalPages;
        }
        if (responseData.totalElements !== undefined) {
            totalElements = responseData.totalElements;
        }

        // Получаем данные из ответа
        const records = responseData.content || [];

        // Если данных нет, обновляем пагинацию и завершаем обработку
        if (records.length === 0) {
            table.clear().draw();
            updatePagination();
            return;
        }

        // Кэшируем датчики для улучшения производительности
        const sensorCache = new Map();

        // Получаем все датчики для поля
        return fetch(`/sensors/field/${selectedFieldId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка при загрузке датчиков: ${response.status}`);
            }
            return response.json();
        })
        .then(sensors => {
            // Заполняем кэш датчиков
            sensors.forEach(sensor => {
                sensorCache.set(sensor.id, sensor);
            });

            // Очищаем таблицу
            table.clear();

            // Обрабатываем данные с датчиков
            records.forEach(record => {
                if (!record.sensor_id) {
                    console.warn('Missing sensor_id in record:', record);
                    return;
                }

                // Получаем данные датчика из кэша
                const sensor = sensorCache.get(record.sensor_id);
                if (!sensor) {
                    console.warn(`Sensor with ID ${record.sensor_id} not found`);
                    return;
                }

                const formattedDate = formatDate(record.timestamp);
                const accuracyClass = sensor.accuracyClass || '-';

                // Проверяем наличие дополнительных параметров
                const hasExtraParams = record.extraParams && Object.keys(record.extraParams).length > 0;
                const extraParamsStr = JSON.stringify(record.extraParams || {}).replace(/\"/g, '&quot;');
                const extraParamsDisplay = hasExtraParams ?
                    `<button class="btn btn-info btn-sm view-params-btn" onclick="viewRecordParams('${record.id}', '${sensor.sensorName || sensor.id}', '${extraParamsStr}')">
                        <i class="fa fa-list"></i> Показать
                    </button>` :
                    '<span class="text-muted">Нет</span>';

                const rowData = {
                    id: record.id,
                    sensorId: sensor.sensorName || sensor.id, // Отображаем имя датчика вместо ID
                    uniqueIndex: record.id || '-',
                    value: record.value !== undefined ? record.value : '-',
                    unit: sensor.unit || '-',
                    accuracyClass: accuracyClass,
                    extraParams: extraParamsDisplay,
                    timestamp: formattedDate,
                    actions: `<button class="btn btn-warning btn-sm" onclick="showEditModal('${record.id}', '${sensor.id}', '${(sensor.sensorName || '').replace(/'/g, "\\'")}', ${record.value || 0}, '${record.timestamp || ''}', '${(sensor.unit || '').replace(/'/g, "\\'")}', '${(sensor.accuracyClass || '').replace(/'/g, "\\'")}', '${extraParamsStr.replace(/'/g, "\\'")}')">
                        <i class="fa fa-edit"></i> Редактировать</button>
                        <button class="btn btn-danger btn-sm" onclick="showDeleteModal('${record.id}')">
                        <i class="fa fa-trash"></i> Удалить</button>`
                };

                console.log('Adding row:', rowData);
                table.row.add(rowData);
            });

            // Перерисовываем таблицу
            table.draw();

            // Проверяем и удаляем пустые строки, если они есть
            table.rows().every(function() {
                const rowData = this.data();
                if (!rowData || (typeof rowData === 'object' && Object.keys(rowData).length === 0)) {
                    this.remove();
                }
            });

            // Обновляем пагинацию и устанавливаем WebSocket подписку
            updatePagination();
            subscribeToFieldUpdates(selectedFieldId);
        });
    })
    .catch(error => {
        console.error('Error fetching field data:', error);
        table.clear().draw();
        $('#custom-pagination').html(`<div class="alert alert-danger">Ошибка при загрузке данных: ${error.message}</div>`);
    });
}

function subscribeToFieldUpdates(fieldId) {
    if (stompClient && stompClient.connected) {
        if (currentSubscription) {
            currentSubscription.unsubscribe();
            currentSubscription = null;
        }
        console.log('Subscribing to /topic/field-data/' + fieldId);
        currentSubscription = stompClient.subscribe(`/topic/field-data/${fieldId}`, function(message) {
            console.log('Received WebSocket message:', message.body);
            const data = JSON.parse(message.body);
            if (data.field_id === selectedFieldId) {
                if (data.type === "DELETE") {
                    console.log('Processing DELETE message for ID:', data.id);
                    table.rows().every(function() {
                        const rowData = this.data();
                        if (rowData.id === data.id) {
                            this.remove();
                        }
                    });
                    table.draw();
                } else {
                    // Получаем информацию о датчике
                    fetch(`/sensors/${data.sensor_id}`)
                        .then(response => response.json())
                        .then(sensor => {
                            let exists = false;
                            table.rows().every(function() {
                                const rowData = this.data();
                                if (rowData.id === data.id) {
                                    exists = true;
                                    return false;
                                }
                            });

                            console.log('Does row exist?', exists);
                            if (!exists) {
                                if (!data.sensor_id) {
                                    console.warn('Missing sensor_id in WebSocket data:', data);
                                    return;
                                }

                                const formattedDate = formatDate(data.timestamp);
                                const accuracyClass = sensor.accuracyClass || '-';

                                // Проверяем наличие дополнительных параметров
                                const hasExtraParams = data.extraParams && Object.keys(data.extraParams).length > 0;
                                const extraParamsStr = data.extraParams ? JSON.stringify(data.extraParams) : '{}';
                                const extraParamsDisplay = hasExtraParams ?
                                    `<button class="btn btn-info btn-sm view-params-btn" onclick="viewRecordParams('${data.id}', '${sensor.sensorName || sensor.id}', '${extraParamsStr.replace(/'/g, "\\'")}')">
                                        <i class="fa fa-list"></i> Показать
                                    </button>` :
                                    '<span class="text-muted">Нет</span>';

                                const rowData = {
                                    id: data.id,
                                    sensorId: sensor.sensorName || sensor.id, // Отображаем имя датчика вместо ID
                                    uniqueIndex: data.id || '-',
                                    value: data.value !== undefined ? data.value : '-',
                                    unit: sensor.unit || '-',
                                    accuracyClass: accuracyClass,
                                    extraParams: extraParamsDisplay,
                                    timestamp: formattedDate,
                                    actions: `<button class="btn btn-warning btn-sm" onclick="showEditModal('${data.id}', '${sensor.id}', '${(sensor.sensorName || '').replace(/'/g, "\\'")}', ${data.value || 0}, '${data.timestamp || ''}', '${(sensor.unit || '').replace(/'/g, "\\'")}', '${(sensor.accuracyClass || '').replace(/'/g, "\\'")}', '${extraParamsStr.replace(/'/g, "\\'")}')">
                                        <i class="fa fa-edit"></i> Редактировать</button>
                                        <button class="btn btn-danger btn-sm" onclick="showDeleteModal('${data.id}')">
                                        <i class="fa fa-trash"></i> Удалить</button>`
                                };

                                console.log('Adding WebSocket row:', rowData);
                                try {
                                    table.row.add(rowData);
                                    table.draw(); // Перерисовываем таблицу с учётом текущей сортировки
                                } catch (error) {
                                    console.error('Error adding row to DataTables:', error);
                                }
                            } else {
                                console.log('Row already exists for ID:', data.id);
                            }
                        });
                }
            } else {
                console.log('Message ignored: fieldId does not match selectedFieldId', data.field_id, selectedFieldId);
            }
        }, function(error) {
            console.error('WebSocket subscription error:', error);
        });
    } else {
        console.warn('Cannot subscribe: stompClient is not connected');
    }
}

function formatDate(timestamp) {
    if (!timestamp) {
        return { display: 'N/A', sort: 0 };
    }
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
        return { display: 'Invalid Date', sort: 0 };
    }
    const display = date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    return { display: display, sort: date.getTime() };
}

// Функция для отображения модального окна редактирования параметров
function showEditParamsModal() {
    // Устанавливаем название записи
    const sensorName = document.getElementById('edit-sensor-name').value;
    $('#edit-params-record-name').text(sensorName);

    // Сохраняем исходную копию параметров для восстановления при отмене
    originalParams = JSON.parse(JSON.stringify(editingParams));

    // Отображаем параметры
    renderExtraParamsList();

    // Очищаем поля ввода
    clearParamInputFields();

    // Сбрасываем состояние активности кнопки сохранения
    document.getElementById('save-extra-params').classList.remove('active');

    // Временно скрываем фон первого модального окна при открытии второго
    if ($('.modal-backdrop').length > 0) {
        // Находим последний бэкдроп и увеличиваем его z-index
        const currentBackdrop = $('.modal-backdrop').last();
        const newZIndex = parseInt(currentBackdrop.css('z-index')) + 10;

        // Создаем новый бэкдроп для второго модального окна
        $('body').append('<div class="modal-backdrop show temp-backdrop"></div>');
        $('.temp-backdrop').css('z-index', newZIndex);
    }

    // Показываем модальное окно
    $('#editParamsModal').modal({
        backdrop: false, // Отключаем автоматический бэкдроп
        keyboard: true // Разрешаем закрытие по Esc
    });

    // Устанавливаем более высокий z-index для второго модального окна
    setTimeout(() => {
        $('#editParamsModal').css('z-index', 1060);
    }, 10);
}

// Функция для отображения списка дополнительных параметров
function renderExtraParamsList() {
    const container = document.getElementById('extra-params-list');
    container.innerHTML = '';

    if (Object.keys(editingParams).length === 0) {
        container.innerHTML = '<p>Нет дополнительных параметров</p>';
        return;
    }

    for (const [key, value] of Object.entries(editingParams)) {
        const paramBadge = document.createElement('div');
        paramBadge.className = 'param-badge';

        // Экранируем кавычки в ключе для безопасного использования в onclick
        const escapedKey = key.replace(/(['"\\\[\]])/g, '\\$1');

        paramBadge.innerHTML = `
            <span class="param-key">${key}:</span>
            <span class="param-value">${value}</span>
            <span class="edit-param" onclick="editExtraParam('${escapedKey}')">✏️</span>
            <span class="remove-param" onclick="removeExtraParam('${escapedKey}')">&times;</span>
        `;
        container.appendChild(paramBadge);
    }
}

// Функция для добавления дополнительного параметра
function addExtraParam() {
    const key = document.getElementById('param-key').value.trim();
    const value = document.getElementById('param-value').value.trim();

    if (!key) {
        alert('Название параметра не может быть пустым');
        return;
    }

    // Проверяем, существует ли уже параметр с таким ключом
    if (editingParams.hasOwnProperty(key)) {
        alert(`Параметр с названием "${key}" уже существует. Используйте редактирование для изменения значения.`);
        return;
    }

    // Определяем тип значения и преобразуем при необходимости
    let parsedValue = value;
    if (value.toLowerCase() === 'true') {
        parsedValue = true;
    } else if (value.toLowerCase() === 'false') {
        parsedValue = false;
    } else if (!isNaN(value) && value !== '') {
        parsedValue = Number(value);
    }

    // Добавляем в рабочую копию
    editingParams[key] = parsedValue;

    // Очищаем поля ввода
    clearParamInputFields();

    // Обновляем отображение списка параметров
    renderExtraParamsList();
}

// Функция для редактирования параметра
function editExtraParam(key) {
    if (editingParams.hasOwnProperty(key)) {
        // Устанавливаем режим редактирования
        editingParamKey = key;

        // Заполняем поля значениями
        document.getElementById('param-key').value = key;
        document.getElementById('param-key').disabled = true; // Блокируем изменение ключа
        document.getElementById('param-value').value = editingParams[key];

        // Меняем текст кнопки
        $('#add-param-btn').text('✓');
    }
}

// Функция для обновления значения параметра
function updateExtraParam() {
    if (editingParamKey === null) return;

    const value = document.getElementById('param-value').value.trim();

    // Определяем тип значения и преобразуем при необходимости
    let parsedValue = value;
    if (value.toLowerCase() === 'true') {
        parsedValue = true;
    } else if (value.toLowerCase() === 'false') {
        parsedValue = false;
    } else if (!isNaN(value) && value !== '') {
        parsedValue = Number(value);
    }

    // Обновляем значение
    editingParams[editingParamKey] = parsedValue;

    // Очищаем поля ввода и сбрасываем режим редактирования
    clearParamInputFields();

    // Обновляем отображение списка параметров
    renderExtraParamsList();
}

// Функция для удаления параметра
function removeExtraParam(key) {
    if (editingParams.hasOwnProperty(key)) {
        delete editingParams[key];
        renderExtraParamsList();

        // Если мы редактировали этот параметр, сбрасываем режим редактирования
        if (editingParamKey === key) {
            editingParamKey = null;
            document.getElementById('param-key').value = '';
            document.getElementById('param-key').disabled = false;
            document.getElementById('param-value').value = '';
            $('#add-param-btn').text('+');
        }
    }
}

// Функция для очистки полей ввода
function clearParamInputFields() {
    document.getElementById('param-key').value = '';
    document.getElementById('param-value').value = '';
    document.getElementById('param-key').disabled = false;
    editingParamKey = null;
    $('#add-param-btn').text('+');
}

// Функция для показа дополнительных параметров записи
function viewRecordParams(id, sensorName, extraParamsStr) {
    // Показываем имя записи
    $('#params-record-name').text(sensorName);

    // Находим tbody таблицы параметров
    const tbody = $('#params-table').find('tbody');

    // Очищаем содержимое tbody
    tbody.empty();

    // Пытаемся распарсить JSON строку параметров
    try {
        const extraParams = JSON.parse(extraParamsStr);

        if (extraParams && Object.keys(extraParams).length > 0) {
            // Добавляем строки с параметрами
            for (const [key, value] of Object.entries(extraParams)) {
                // Преобразуем значение в строку для отображения
                let displayValue = value;
                if (typeof value === 'object' && value !== null) {
                    displayValue = JSON.stringify(value);
                }

                tbody.append(`
                    <tr>
                        <td>${key}</td>
                        <td>${displayValue}</td>
                    </tr>
                `);
            }
        } else {
            // Отображаем сообщение об отсутствии параметров
            tbody.append(`
                <tr>
                    <td colspan="2" class="text-center">
                        У этой записи нет дополнительных параметров
                    </td>
                </tr>
            `);
        }
    } catch (e) {
        console.error('Ошибка при парсинге параметров:', e, extraParamsStr);
        // В случае ошибки при парсинге JSON
        tbody.append(`
            <tr>
                <td colspan="2" class="text-center text-danger">
                    Ошибка при обработке дополнительных параметров: ${e.message}
                </td>
            </tr>
        `);
    }

    // Показываем модальное окно
    $('#viewParamsModal').modal('show');
}

function showEditModal(id, sensorId, sensorName, value, timestamp, unit, accuracyClass, extraParamsStr) {
    selectedRecordId = id;
    selectedSensorId = sensorId;

    document.getElementById('edit-sensor-name').value = sensorName;
    document.getElementById('edit-value').value = value;

    // Конвертируем timestamp в локальный формат для input datetime-local
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
        const localDatetime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString().slice(0, 16);
        document.getElementById('edit-timestamp').value = localDatetime;
    }

    document.getElementById('edit-unit').value = unit;
    document.getElementById('edit-accuracy-class').value = accuracyClass || '';

    // Парсим JSON строку параметров
    editingParams = {};
    try {
        const params = JSON.parse(extraParamsStr);
        if (params && typeof params === 'object') {
            editingParams = { ...params }; // Создаем копию объекта
        }
    } catch (e) {
        console.warn("Ошибка при парсинге JSON параметров:", e);
    }

    // Создаем исходную копию параметров
    originalParams = JSON.parse(JSON.stringify(editingParams));

    $('#editRecordModal').modal('show');
}

function saveRecordChanges() {
    const value = document.getElementById('edit-value').value;
    const inputTimestamp = document.getElementById('edit-timestamp').value;
    const date = new Date(inputTimestamp);
    const timestamp = date.toISOString();

    // Обновляем только данные записи
    fetch(`/sensorData/${selectedRecordId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: selectedRecordId,
            sensor_id: selectedSensorId,
            field_id: selectedFieldId,
            value: parseFloat(value),
            timestamp: timestamp,
            extraParams: Object.keys(editingParams).length > 0 ? editingParams : null
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Record updated:', data);
        $('#editRecordModal').modal('hide');
        fetchFieldData();
    })
    .catch(error => {
        console.error('Error updating record data:', error);
        alert('Ошибка при обновлении записи: ' + error.message);
    });
}

function showDeleteModal(id) {
    selectedRecordId = id;
    $('#deleteRecordModal').modal('show');
}

function deleteRecord() {
    fetch(`/sensorData/${selectedRecordId}`, {
        method: 'DELETE'
    })
    .then(() => {
        $('#deleteRecordModal').modal('hide');
        fetchFieldData();
    })
    .catch(error => {
        console.error('Error deleting record:', error);
        alert('Ошибка при удалении записи: ' + error.message);
    });
}