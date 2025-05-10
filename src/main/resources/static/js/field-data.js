let currentPage = 0;
let table;
let selectedRecordId = null;
let selectedFieldId = null;
let selectedSensorId = null;
let stompClient = null;
let currentSubscription = null;

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

    initDataTable();
    connectWebSocket(); // fetchFields будет вызван после успешного подключения
});

$(function(){
    $("#nav-placeholder").load("/nav.html", function() {
        highlightActiveNavItem();
    });
});

function initDataTable() {
    table = $('#field-data-table').DataTable({
        paging: true,
        pageLength: 10,
        searching: true,
        ordering: true,
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
        drawCallback: function() {
            // Удаляем пустые строки после отрисовки таблицы
            const api = this.api();
            api.rows().every(function() {
                const data = this.data();
                if (!data || Object.keys(data).length === 0 ||
                    (data.sensorId === '-' && data.uniqueIndex === '-' && data.value === '-')) {
                    this.remove();
                }
            });
        }
    });
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

            data.forEach(field => {
                const option = document.createElement('option');
                option.value = field.id;
                option.textContent = field.fieldName;
                fieldSelect.appendChild(option);
            });

            if (data.length > 0) {
                selectedFieldId = fieldSelect.value;
                fetchFieldData();
            }
        })
        .catch(error => {
            console.error('Error fetching fields:', error);
        });
}

function fetchFieldData() {
    selectedFieldId = document.getElementById('field-select').value;
    fetch(`/sensorData/field/${selectedFieldId}?page=${currentPage}&size=100`)
        .then(response => response.json())
        .then(data => {
            console.log('Received data:', data);
            table.clear();

            // Кэшируем датчики для улучшения производительности
            const sensorCache = new Map();

            // Создаем счетчик для обработки асинхронных запросов
            let pendingRequests = 1; // Начинаем с 1 для основного запроса

            // Получаем все датчики для поля
            fetch(`/sensors/field/${selectedFieldId}`)
                .then(response => response.json())
                .then(sensors => {
                    // Заполняем кэш датчиков
                    sensors.forEach(sensor => {
                        sensorCache.set(sensor.id, sensor);
                    });

                    // Обрабатываем данные с датчиков
                    if (data.length === 0) {
                        table.draw();
                        return;
                    }

                    data.forEach(record => {
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
                        const extraParams = record.extraParams ? JSON.stringify(record.extraParams) : '-';

                        const rowData = {
                            id: record.id,
                            sensorId: sensor.sensorName || sensor.id, // Отображаем имя датчика вместо ID
                            uniqueIndex: record.uniqueIndex || '-',
                            value: record.value !== undefined ? record.value : '-',
                            unit: sensor.unit || '-',
                            accuracyClass: accuracyClass,
                            extraParams: extraParams,
                            timestamp: formattedDate,
                            actions: `<button class="btn btn-warning btn-sm"
                                onclick="showEditModal('${record.id}', '${sensor.id}',
                                '${sensor.sensorName || ''}', ${record.value || 0},
                                '${record.timestamp || ''}', '${sensor.unit || ''}',
                                '${sensor.accuracyClass || ''}', '${extraParams}')">
                                Редактировать</button>
                                <button class="btn btn-danger btn-sm"
                                onclick="showDeleteModal('${record.id}')">
                                Удалить</button>`
                        };

                        console.log('Adding row:', rowData);
                        table.row.add(rowData);
                    });

                    // Уменьшаем счетчик и проверяем, все ли запросы выполнены
                    pendingRequests--;
                    if (pendingRequests === 0) {
                        // Перерисовываем таблицу только один раз, когда все данные добавлены
                        table.draw();

                        // Проверяем и удаляем пустые строки, если они есть
                        table.rows().every(function() {
                            const rowData = this.data();
                            if (!rowData || (typeof rowData === 'object' && Object.keys(rowData).length === 0)) {
                                this.remove();
                            }
                        });

                        table.draw(); // Перерисовываем ещё раз после удаления пустых строк
                        subscribeToFieldUpdates(selectedFieldId);
                    }
                })
                .catch(error => {
                    console.error('Error fetching sensors:', error);
                    pendingRequests--;
                    if (pendingRequests === 0) {
                        table.draw();
                    }
                });
        })
        .catch(error => {
            console.error('Error fetching field data:', error);
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
                                const extraParams = data.extraParams ? JSON.stringify(data.extraParams) : '-';

                                const rowData = {
                                    id: data.id,
                                    sensorId: sensor.sensorName || sensor.id, // Отображаем имя датчика вместо ID
                                    uniqueIndex: data.uniqueIndex || '-',
                                    value: data.value !== undefined ? data.value : '-',
                                    unit: sensor.unit || '-',
                                    accuracyClass: accuracyClass,
                                    extraParams: extraParams,
                                    timestamp: formattedDate,
                                    actions: `<button class="btn btn-warning btn-sm"
                                        onclick="showEditModal('${data.id}', '${sensor.id}',
                                        '${sensor.sensorName || ''}', ${data.value || 0},
                                        '${data.timestamp || ''}', '${sensor.unit || ''}',
                                        '${sensor.accuracyClass || ''}', '${extraParams}')">
                                        Редактировать</button>
                                        <button class="btn btn-danger btn-sm"
                                        onclick="showDeleteModal('${data.id}')">
                                        Удалить</button>`
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

function showEditModal(id, sensorId, sensorName, value, timestamp, unit, accuracyClass, extraParams) {
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
    document.getElementById('edit-extra-params').value = extraParams !== 'undefined' ? extraParams : '{}';

    $('#editRecordModal').modal('show');
}

function saveRecordChanges() {
    const value = document.getElementById('edit-value').value;

    // Получаем timestamp в формате ISO для отправки на сервер
    const inputTimestamp = document.getElementById('edit-timestamp').value;
    const date = new Date(inputTimestamp);
    const timestamp = date.toISOString();

    // Получаем JSON из текстового поля
    const extraParamsInput = document.getElementById('edit-extra-params').value.trim();
    let extraParams = null;
    if (extraParamsInput) {
        try {
            extraParams = JSON.parse(extraParamsInput);
        } catch (e) {
            alert('Некорректный формат дополнительных параметров: ' + e.message);
            return;
        }
    }

    // Получаем детали датчика
    fetch(`/sensors/${selectedSensorId}`)
        .then(response => response.json())
        .then(sensor => {
            // Обновляем данные датчика, если изменились
            const newAccuracyClass = document.getElementById('edit-accuracy-class').value.trim();
            const newUnit = document.getElementById('edit-unit').value.trim();

            let sensorUpdated = false;

            if (newAccuracyClass !== (sensor.accuracyClass || '')) {
                sensor.accuracyClass = newAccuracyClass || null;
                sensorUpdated = true;
            }

            if (newUnit !== (sensor.unit || '')) {
                sensor.unit = newUnit || null;
                sensorUpdated = true;
            }

            // Если датчик изменен, обновляем его
            const sensorPromise = sensorUpdated ?
                fetch(`/sensors/${selectedSensorId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(sensor)
                }) : Promise.resolve();

            // Обновляем данные записи
            sensorPromise.then(() => {
                return fetch(`/sensorData/${selectedRecordId}`, {
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
                        extraParams: extraParams
                    })
                });
            })
            .then(response => response.json())
            .then(data => {
                console.log('Record updated:', data);
                $('#editRecordModal').modal('hide');
                fetchFieldData();
            });
        })
        .catch(error => {
            console.error('Error updating record:', error);
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
        });
}