let selectedFieldId = null;
let fieldsWithData = [];
let currentModalMode = 'new'; // 'new' или 'edit'
let fieldParamsMap = new Map(); // Хранилище параметров по id полей
let workingParams = {}; // Рабочая копия параметров для модального окна
let editingParamKey = null; // Ключ редактируемого параметра

// В начало файла добавьте:
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

    // Обработчик для модального окна с параметрами датчика
    $('#viewSensorParamsModal').on('hidden.bs.modal', function() {
        // Перемещаем фокус на элемент вне модального окна
        $('#field-name-display').focus();
    });
});

$(function(){
    $("#nav-placeholder").load("/nav.html", function() {
        highlightActiveNavItem();
    });
});

document.addEventListener('DOMContentLoaded', function() {
    $('#fields-table').DataTable({
        language: {
            "processing": "Подождите...",
            "search": "Поиск:",
            "lengthMenu": "Показать _MENU_ записей",
            "info": "Записи с _START_ до _END_ из _TOTAL_ записей",
            "infoEmpty": "Записи с 0 до 0 из 0 записей",
            "infoFiltered": "(отфильтровано из _MAX_ записей)",
            "infoPostFix": "",
            "loadingRecords": "Загрузка записей...",
            "zeroRecords": "Записи отсутствуют.",
            "emptyTable": "В таблице отсутствуют данные",
            "paginate": {
                "first": "Первая",
                "previous": "Предыдущая",
                "next": "Следующая",
                "last": "Последняя"
            },
            "aria": {
                "sortAscending": ": активировать для сортировки столбца по возрастанию",
                "sortDescending": ": активировать для сортировки столбца по убыванию"
            }
        }
    });

    fetchFields();

    // Обработчик для сохранения параметров из модального окна
    $('#save-extra-params').on('click', function() {
        if (currentModalMode === 'new') {
            // Для новых полей сохраняем параметры в переменной
            fieldParamsMap.set('new', {...workingParams});
        } else if (currentModalMode === 'edit') {
            // Для существующих полей сохраняем параметры по ID поля
            fieldParamsMap.set(selectedFieldId, {...workingParams});
        }
        clearParamInputFields();
        $('#extraParamsModal').modal('hide');
        $('.temp-backdrop').remove(); // Удаляем временный бэкдроп
    });

    // Обработчик для отмены изменений (кнопка "Закрыть")
    $('#close-extra-params').on('click', function() {
        clearParamInputFields();
        $('#extraParamsModal').modal('hide');
        $('.temp-backdrop').remove(); // Удаляем временный бэкдроп
    });

    // Обработчик закрытия модального окна (любым способом)
    $('#extraParamsModal').on('hidden.bs.modal', function() {
        clearParamInputFields();
        editingParamKey = null; // Сбрасываем режим редактирования
        $('#add-param-btn').text('+'); // Возвращаем кнопке исходный текст
        $('.temp-backdrop').remove(); // Удаляем временный бэкдроп

        // Возвращаем фокус на кнопку в первом модальном окне
        setTimeout(() => {
            if ($('#editFieldModal').is(':visible')) {
                $('button[onclick="showAddParamsModal(\'edit\')"]').focus();
            }
        }, 100);
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
});

// Функция для очистки полей ввода параметров и сброса режима редактирования
function clearParamInputFields() {
    document.getElementById('param-key').value = '';
    document.getElementById('param-value').value = '';
    document.getElementById('param-key').disabled = false;
    editingParamKey = null;
    $('#add-param-btn').text('+');
}

function fetchFields() {
    fetch('/fields')
        .then(response => response.json())
        .then(data => {
            const table = $('#fields-table').DataTable();
            table.clear();
            fieldParamsMap.clear(); // Очищаем карту параметров
            fieldsWithData = []; // Очищаем список полей с данными

            data.forEach(field => {
                // Сохраняем параметры поля в карту
                if (field.extraParams) {
                    fieldParamsMap.set(field.id, field.extraParams);
                }

                // Проверяем, есть ли данные для поля
                fetch(`/sensorData/field/${field.id}?page=0&size=1`)
                    .then(response => response.json())
                    .then(sensorData => {
                        if (sensorData.length > 0) {
                            fieldsWithData.push(field.id);
                        }

                        // Форматируем дополнительные параметры для отображения
                        let extraParamsDisplay = '-';
                        if (field.extraParams) {
                            try {
                                // Создаем читаемое представление параметров
                                let paramsArray = [];
                                for (const [key, value] of Object.entries(field.extraParams)) {
                                    paramsArray.push(`${key}: ${value}`);
                                }
                                extraParamsDisplay = paramsArray.join(', ');

                                // Ограничиваем длину для отображения
                                if (extraParamsDisplay.length > 50) {
                                    extraParamsDisplay = extraParamsDisplay.substring(0, 47) + '...';
                                }
                            } catch (e) {
                                console.error('Error formatting extra params:', e);
                            }
                        }

                        table.row.add([
                            field.fieldName,
                            field.uniqueFieldIdentifier || '-',
                            extraParamsDisplay,
                            `<button class="btn btn-info btn-sm" onclick="viewFieldSensors('${field.id}', '${field.fieldName}')"><i class="fa fa-eye"></i> Датчики</button>`,
                            `<button class="btn btn-info btn-sm" onclick="editField('${field.id}')">Редактировать</button>
                            <button class="btn btn-danger btn-sm" onclick="confirmDeleteField('${field.id}')">Удалить</button>`
                        ]).draw();
                    });
            });
        })
        .catch(error => console.error('Error fetching fields:', error));
}

// Функция для просмотра датчиков поля
function viewFieldSensors(fieldId, fieldName) {
    selectedFieldId = fieldId;
    $('#field-name-display').text(fieldName);

    // Очищаем таблицу и показываем заглушку "Загрузка данных..."
    $('#sensors-data-body').html('<tr><td colspan="5" class="text-center">Загрузка данных...</td></tr>');
    $('#no-sensors-message').hide();

    // Получаем датчики для поля
    fetch(`/sensors/field/${fieldId}`)
        .then(response => response.json())
        .then(sensors => {
            if (sensors && sensors.length > 0) {
                // Очищаем таблицу
                $('#sensors-data-body').empty();

                // Заполняем таблицу данными
                sensors.forEach(sensor => {
                    // Сохраняем копию параметров в атрибуте data-params
                    const sensorName = sensor.sensorName || 'Датчик';
                    const sensorId = sensor.id;

                    // Проверяем наличие дополнительных параметров
                    const hasParams = sensor.extraParams && Object.keys(sensor.extraParams).length > 0;

                    // Добавляем строку в таблицу
                    $('#sensors-data-body').append(`
                        <tr>
                            <td>${sensorName}</td>
                            <td>${sensor.uniqueSensorIdentifier || '-'}</td>
                            <td>${sensor.unit || '-'}</td>
                            <td>${sensor.accuracyClass || '-'}</td>
                            <td>
                                <button class="btn btn-info btn-sm view-sensor-params"
                                        data-sensor-id="${sensorId}"
                                        data-sensor-name="${sensorName}"
                                        ${!hasParams ? 'disabled' : ''}>
                                    <i class="fa fa-list"></i> Доп. параметры
                                </button>
                            </td>
                        </tr>
                    `);
                });

                // Добавляем обработчик для кнопок просмотра параметров
                $('.view-sensor-params').on('click', function() {
                    const sensorId = $(this).data('sensor-id');
                    const sensorName = $(this).data('sensor-name');

                    // Загружаем данные датчика и его параметры
                    fetch(`/sensors/${sensorId}`)
                        .then(response => response.json())
                        .then(sensor => {
                            // Показываем параметры датчика
                            viewSensorParams(sensorName, sensor.extraParams);
                        })
                        .catch(error => {
                            console.error('Error fetching sensor details:', error);
                            alert('Ошибка при загрузке параметров датчика');
                        });
                });

                // Показываем таблицу
                $('#sensors-data-table').show();
                $('#no-sensors-message').hide();
            } else {
                // Если датчиков нет, показываем сообщение
                $('#sensors-data-table').hide();
                $('#no-sensors-message').show();
            }

            // Показываем модальное окно
            $('#viewSensorsModal').modal('show');
        })
        .catch(error => {
            console.error('Error fetching sensors:', error);
            $('#sensors-data-body').html('<tr><td colspan="5" class="text-center text-danger">Ошибка при загрузке данных</td></tr>');
        });
}

// Функция для просмотра дополнительных параметров датчика
function viewSensorParams(sensorName, params) {
    // Показываем название датчика
    $('#sensor-name-display').text(sensorName);

    // Находим tbody существующей таблицы
    const tbody = $('#sensor-params-list').find('tbody');

    // Показываем модальное окно сразу с индикатором загрузки
    $('#viewSensorParamsModal').modal('show');

    // Небольшая задержка для анимации открытия и индикатора загрузки
    setTimeout(() => {
        // Очищаем содержимое tbody
        tbody.empty();

        if (params && Object.keys(params).length > 0) {
            // Добавляем строки с параметрами
            for (const [key, value] of Object.entries(params)) {
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
                        У этого датчика нет дополнительных параметров
                    </td>
                </tr>
            `);
        }
    }, 300);
}

function addField() {
    const fieldName = document.getElementById('new-field-name').value.trim();

    if (!fieldName) {
        alert('Название поля не может быть пустым');
        return;
    }

    fetch('/fields')
        .then(response => response.json())
        .then(fields => {
            if (fields.some(field => field.fieldName === fieldName)) {
                alert('Поле с таким названием уже существует');
                throw new Error('Поле с таким названием уже существует');
            }

            // Получаем сохраненные параметры для нового поля
            const extraParams = fieldParamsMap.get('new') || {};

            // Создаем новое поле
            return fetch('/fields', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fieldName: fieldName,
                    uniqueFieldIdentifier: generateUUID(),
                    extraParams: Object.keys(extraParams).length > 0 ? extraParams : null,
                    sensors: [] // Пустой массив датчиков
                })
            });
        })
        .then(response => response.json())
        .then(data => {
            console.log('Field added:', data);
            fetchFields();
            resetForm();
            fieldParamsMap.delete('new'); // Удаляем временные параметры
        })
        .catch(error => console.error('Error adding field:', error));
}

function resetForm() {
    document.getElementById('new-field-name').value = '';
    fieldParamsMap.delete('new'); // Удаляем временные параметры
}

function editField(fieldId) {
    selectedFieldId = fieldId;

    // Получаем данные о поле
    fetch(`/fields/${fieldId}`)
        .then(response => response.json())
        .then(field => {
            document.getElementById('edit-field-name').value = field.fieldName;
            document.getElementById('edit-field-identifier').value = field.uniqueFieldIdentifier || '';

            // Сохраняем параметры в карту, если их еще нет
            if (field.extraParams && !fieldParamsMap.has(fieldId)) {
                fieldParamsMap.set(fieldId, field.extraParams);
            }

            // Проверяем, есть ли данные для этого поля
            if (fieldsWithData.includes(fieldId)) {
                document.getElementById('edit-field-name').disabled = true;
            } else {
                document.getElementById('edit-field-name').disabled = false;
            }

            $('#editFieldModal').modal('show');
        })
        .catch(error => console.error('Error fetching field:', error));
}

function saveFieldChanges() {
    const fieldName = document.getElementById('edit-field-name').value.trim();

    if (!fieldName) {
        alert('Название поля не может быть пустым');
        return;
    }

    // Получаем текущие данные поля
    fetch(`/fields/${selectedFieldId}`)
        .then(response => response.json())
        .then(field => {
            // Получаем сохраненные параметры для поля
            const extraParams = fieldParamsMap.get(selectedFieldId) || {};

            // Обновляем только нужные поля
            const updatedField = {
                ...field,
                fieldName: fieldName,
                extraParams: Object.keys(extraParams).length > 0 ? extraParams : null
            };

            return fetch(`/fields/${selectedFieldId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedField)
            });
        })
        .then(response => response.json())
        .then(data => {
            console.log('Field updated:', data);
            $('#editFieldModal').modal('hide');
            fetchFields();
        })
        .catch(error => console.error('Error updating field:', error));
}

function confirmDeleteField(fieldId) {
    selectedFieldId = fieldId;

    if (fieldsWithData.includes(fieldId)) {
        alert('Нельзя удалить поле, у которого уже есть данные с датчиков');
    } else {
        $('#deleteFieldModal').modal('show');
    }
}

function deleteField() {
    fetch(`/fields/${selectedFieldId}`, {
        method: 'DELETE'
    })
        .then(() => {
            console.log('Field deleted');
            $('#deleteFieldModal').modal('hide');
            fieldParamsMap.delete(selectedFieldId); // Удаляем параметры удаленного поля
            fetchFields();
        })
        .catch(error => console.error('Error deleting field:', error));
}

// Вспомогательная функция для генерации UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Функция для отображения модального окна с дополнительными параметрами
function showAddParamsModal(mode) {
    currentModalMode = mode;

    // Очищаем рабочую копию
    workingParams = {};

    // Получаем текущие параметры в зависимости от режима
    let currentParams = {};
    if (mode === 'new') {
        currentParams = fieldParamsMap.get('new') || {};
    } else if (mode === 'edit') {
        currentParams = fieldParamsMap.get(selectedFieldId) || {};
    }

    // Копируем параметры в рабочую копию
    workingParams = {...currentParams};

    // Отображаем параметры
    renderExtraParamsList();

    // Очищаем поля ввода
    clearParamInputFields();

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
    $('#extraParamsModal').modal({
        backdrop: false, // Отключаем автоматический бэкдроп
        keyboard: true   // Разрешаем закрытие по Esc
    });

    // Устанавливаем более высокий z-index для второго модального окна
    setTimeout(() => {
        $('#extraParamsModal').css('z-index', 1060);
    }, 10);
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
    if (workingParams.hasOwnProperty(key)) {
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
    workingParams[key] = parsedValue;

    // Очищаем поля ввода
    clearParamInputFields();

    // Обновляем отображение списка параметров
    renderExtraParamsList();
}

// Функция для удаления дополнительного параметра
function removeExtraParam(key) {
    if (workingParams.hasOwnProperty(key)) {
        delete workingParams[key];
        renderExtraParamsList();
    }
}

// Функция для начала редактирования параметра
function editExtraParam(key) {
    // Если уже редактируем - сначала отменяем текущее редактирование
    if (editingParamKey !== null) {
        clearParamInputFields();
    }

    if (workingParams.hasOwnProperty(key)) {
        // Устанавливаем режим редактирования
        editingParamKey = key;

        // Заполняем поля значениями
        document.getElementById('param-key').value = key;
        document.getElementById('param-key').disabled = true; // Блокируем изменение ключа
        document.getElementById('param-value').value = workingParams[key];

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
    workingParams[editingParamKey] = parsedValue;

    // Очищаем поля ввода и сбрасываем режим редактирования
    clearParamInputFields();

    // Обновляем отображение списка параметров
    renderExtraParamsList();
}

// Функция для отображения списка дополнительных параметров
function renderExtraParamsList() {
    const container = document.getElementById('extra-params-list');
    container.innerHTML = '';

    if (Object.keys(workingParams).length === 0) {
        container.innerHTML = '<p>Нет дополнительных параметров</p>';
        return;
    }

    for (const [key, value] of Object.entries(workingParams)) {
        const paramBadge = document.createElement('div');
        paramBadge.className = 'param-badge';

        // Экранируем кавычки в ключе для безопасного использования в onclick
        const escapedKey = key.replace(/(['"])/g, '\\$1');

        paramBadge.innerHTML = `
            <span class="param-key">${key}:</span>
            <span class="param-value">${value}</span>
            <span class="edit-param" onclick="editExtraParam('${escapedKey}')">✏️</span>
            <span class="remove-param" onclick="removeExtraParam('${escapedKey}')">&times;</span>
        `;
        container.appendChild(paramBadge);
    }
}