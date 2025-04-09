let currentPage = 0;
let table;
let selectedRecordId = null;
let selectedFieldId = null;
let selectedSensorName = null;
let selectedUnit = null;
let stompClient = null;
let currentSubscription = null;

$(document).ready(function() {
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
            { data: 'sensorName' },
            { data: 'value' },
            { data: 'unit' },
            { data: 'accuracyClass', defaultContent: '-' },
            { data: 'extraParams', defaultContent: '-' },
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
        order: [[5, 'desc']]
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
            data.forEach(record => {
                if (!record.sensorName) {
                    console.warn('Missing sensorName in record:', record);
                    return;
                }
                const formattedDate = formatDate(record.timestamp);
                const accuracyClass = record.accuracyClass || '-';
                const rowData = {
                    id: record.id,
                    sensorName: record.sensorName || '-',
                    value: record.value !== undefined ? record.value : '-',
                    unit: record.unit || '-',
                    accuracyClass: accuracyClass,
                    extraParams: record.extraParams ? JSON.stringify(record.extraParams) : '-',
                    timestamp: formattedDate,
                    actions: `<button class="btn btn-warning btn-sm" onclick="showEditModal('${record.id}', '${record.sensorName || ''}', ${record.value || 0}, '${record.timestamp || ''}', '${record.unit || ''}', '${record.accuracyClass || ''}', '${JSON.stringify(record.extraParams || {})}')">Редактировать</button>
                              <button class="btn btn-danger btn-sm" onclick="showDeleteModal('${record.id}')">Удалить</button>`
                };
                console.log('Adding row:', rowData);
                table.row.add(rowData);
            });
            table.draw();
            subscribeToFieldUpdates(selectedFieldId);
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
            if (data.fieldId === selectedFieldId) {
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
                        if (!data.sensorName) {
                            console.warn('Missing sensorName in WebSocket data:', data);
                            return;
                        }
                        const formattedDate = formatDate(data.timestamp);
                        const accuracyClass = data.accuracyClass || '-';
                        const rowData = {
                            id: data.id,
                            sensorName: data.sensorName || '-',
                            value: data.value !== undefined ? data.value : '-',
                            unit: data.unit || '-',
                            accuracyClass: accuracyClass,
                            extraParams: data.extraParams ? JSON.stringify(data.extraParams) : '-',
                            timestamp: formattedDate,
                            actions: `<button class="btn btn-warning btn-sm" onclick="showEditModal('${data.id}', '${data.sensorName || ''}', ${data.value || 0}, '${data.timestamp || ''}', '${data.unit || ''}', '${data.accuracyClass || ''}', '${JSON.stringify(data.extraParams || {})}')">Редактировать</button>
                                      <button class="btn btn-danger btn-sm" onclick="showDeleteModal('${data.id}')">Удалить</button>`
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
                }
            } else {
                console.log('Message ignored: fieldId does not match selectedFieldId', data.fieldId, selectedFieldId);
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

function showEditModal(id, sensorName, value, timestamp, unit, accuracyClass, extraParams) {
    selectedRecordId = id;
    selectedSensorName = sensorName;
    selectedUnit = unit;

    document.getElementById('edit-sensor-name').value = sensorName;
    document.getElementById('edit-value').value = value;
    document.getElementById('edit-timestamp').value = timestamp.slice(0, 16);
    document.getElementById('edit-unit').value = unit;
    document.getElementById('edit-accuracy-class').value = accuracyClass || '';
    document.getElementById('edit-extra-params').value = extraParams !== 'undefined' ? extraParams : '{}';

    $('#editRecordModal').modal('show');
}

function saveRecordChanges() {
    const value = document.getElementById('edit-value').value;
    const timestamp = document.getElementById('edit-timestamp').value + ":00.000Z";
    const unit = document.getElementById('edit-unit').value;
    const accuracyClass = document.getElementById('edit-accuracy-class').value.trim();
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

    fetch(`/sensorData/${selectedRecordId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fieldId: selectedFieldId,
            sensorName: selectedSensorName,
            value: parseFloat(value),
            unit: unit,
            timestamp: timestamp,
            accuracyClass: accuracyClass || null,
            extraParams: extraParams
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Record updated:', data);
        $('#editRecordModal').modal('hide');
        fetchFieldData();
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