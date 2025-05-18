let sensorsTable;
let selectedSensorId = null;
let fieldsCache = new Map(); // Кэш для данных полей
let workingParams = {}; // Рабочая копия параметров для модального окна
let editingParamKey = null; // Ключ редактируемого параметра
let originalParams = {}; // Исходная копия параметров для восстановления при отмене

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

        // Если есть другие открытые модальные окна, сохраняем фон
        if ($('.modal:visible').length > 0) {
            setTimeout(() => {
                // Удаляем только последний фон, если их несколько
                const modalBackdrops = $('.modal-backdrop');
                if (modalBackdrops.length > 1) {
                    modalBackdrops.last().remove();
                }
            }, 100);
        }

        // Убираем оставшиеся фокусы
        $('button.btn, input, select').blur();
    });

    // Загрузка размещения
    $("#nav-placeholder").load("/nav.html", function() {
        highlightActiveNavItem();
    });

    // Инициализация таблицы
    sensorsTable = $('#sensors-table').DataTable({
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
            }
        },
        columns: [
            { data: 'sensorName' },      // Название датчика
            { data: 'sensorIdentifier' }, // Уникальный идентификатор (будем использовать короткий id)
            { data: 'fieldName' },       // Поле
            { data: 'unit' },            // Единицы измерения
            { data: 'accuracyClass' },   // Класс точности
            { data: 'extraParamsIndicator' }, // Доп. параметры
            { data: 'actions' }          // Действия
        ],
        drawCallback: function() {
            // Проверяем и удаляем пустые строки после отрисовки
            const api = this.api();
            api.rows().every(function() {
                const rowData = this.data();
                if (!rowData ||
                    (typeof rowData === 'object' && Object.keys(rowData).length === 0) ||
                    (Array.isArray(rowData) && rowData.every(cell => !cell || cell === '-'))) {
                    this.remove();
                }
            });
        }
    });

    // Загрузка полей для фильтра
    loadFields();

    // Обработчик изменения фильтра по полю
    $('#field-filter').on('change', function() {
        const fieldId = $(this).val();
        console.log("Выбрано поле:", fieldId);

        // Проверяем, было ли выбрано реальное поле или дефолтное значение
        if (fieldId === "") {
            // Если выбрано дефолтное значение "-- Выберите поле --", очищаем таблицу
            sensorsTable.clear().draw();
            return;
        }

        // Иначе загружаем датчики для выбранного поля или все датчики
        loadSensors(fieldId);
    });

    // Обработчики кнопок для модальных окон
    $('#save-sensor-btn').on('click', saveSensorChanges);
    $('#confirm-delete').on('click', deleteSensor);
    $('#show-sensor-params-btn').on('click', function() {
        showExtraParamsModal();
    });

    // Обработчик для модального окна с параметрами
    $('#viewSensorParamsModal').on('hidden.bs.modal', function() {
        // Перемещаем фокус на элемент вне модального окна
        setTimeout(() => {
            $('body').focus();
        }, 100);
    });

    // Обработчик для сохранения параметров из модального окна
    $('#save-extra-params').on('click', function() {
        // При нажатии "Сохранить параметры" обновляем originalParams
        originalParams = JSON.parse(JSON.stringify(workingParams));
        $('#sensorExtraParamsModal').modal('hide');
        // Удаляем временный фон
        $('.temp-backdrop').remove();
    });

    // Обработчик для отмены изменений (кнопка "Закрыть")
    $('#close-extra-params').on('click', function() {
        // Восстанавливаем исходные параметры
        workingParams = JSON.parse(JSON.stringify(originalParams)); // Заменить resetEditingParams() на это
        clearParamInputFields();
        $('#sensorExtraParamsModal').modal('hide');
        $('.temp-backdrop').remove();
    });

    // Обработчик закрытия модального окна (любым способом)
    $('#sensorExtraParamsModal').on('hidden.bs.modal', function() {
        // Когда закрываем без сохранения (не кнопкой "Сохранить параметры")
        // восстанавливаем исходные параметры
        workingParams = JSON.parse(JSON.stringify(originalParams));

        clearParamInputFields();
        editingParamKey = null;
        $('#add-param-btn').text('+');
        $('.temp-backdrop').remove();

        // Возвращаем фокус на кнопку в первом модальном окне
        setTimeout(() => {
            if ($('#editSensorModal').is(':visible')) {
                $('#show-sensor-params-btn').focus();
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

// Загрузка списка полей
function loadFields() {
    fetch('/fields')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Сетевая ошибка: ${response.status}`);
            }
            return response.json();
        })
        .then(fields => {
            console.log("Полученные поля:", fields); // Отладочная информация

            // Сортировка полей по имени
            fields.sort((a, b) => a.fieldName.localeCompare(b.fieldName));

            // Сохраняем в кэш
            fields.forEach(field => {
                fieldsCache.set(field.id, field);
            });

            // Заполняем селект для фильтра
            const fieldFilter = $('#field-filter');
            fieldFilter.empty(); // Очищаем перед заполнением

            // Добавляем опцию "Выберите поле"
            fieldFilter.append(`<option value="">-- Выберите поле --</option>`);

            // Добавляем опцию "Все поля"
            fieldFilter.append(`<option value="all">Все поля</option>`);

            // Добавляем каждое поле
            fields.forEach(field => {
                fieldFilter.append(`<option value="${field.id}">${field.fieldName}</option>`);
            });

            // Устанавливаем выбранную опцию на "-- Выберите поле --"
            fieldFilter.val("");

            // Очищаем таблицу датчиков
            sensorsTable.clear().draw();

            // УБРАЛИ АВТОМАТИЧЕСКУЮ ЗАГРУЗКУ ВСЕХ ДАТЧИКОВ:
            // loadSensors('all');
        })
        .catch(error => {
            console.error('Error loading fields:', error);
            alert('Не удалось загрузить список полей. Пожалуйста, проверьте соединение с сервером.');
        });
}

// Загрузка датчиков с учетом фильтра по полю
function loadSensors(fieldId) {
    console.log("Загрузка датчиков для fieldId:", fieldId);

    let url = '/sensors/all';

    if (fieldId && fieldId !== 'all') {
        url = `/sensors/field/${fieldId}`;
    }

    console.log("URL для загрузки датчиков:", url);

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Сетевая ошибка: ${response.status}`);
            }
            return response.json();
        })
        .then(sensors => {
            console.log("Полученные датчики:", sensors);

            sensorsTable.clear();

            if (sensors.length === 0) {
                console.log("Нет датчиков для отображения");
                sensorsTable.draw();
                return;
            }

            // Проверка на дубликаты названий датчиков по полю
            const sensorNamesByField = {};
            sensors.forEach(sensor => {
                const key = `${sensor.field_id}_${sensor.sensorName}`;
                sensorNamesByField[key] = (sensorNamesByField[key] || 0) + 1;
            });

            // Создаем массив промисов для загрузки информации о полях
            const promises = sensors.map(sensor => {
                // Получаем название поля из кэша или делаем запрос
                let fieldPromise;

                if (fieldsCache.has(sensor.field_id)) {
                    fieldPromise = Promise.resolve(fieldsCache.get(sensor.field_id));
                } else {
                    fieldPromise = fetch(`/fields/${sensor.field_id}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Сетевая ошибка: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(field => {
                        fieldsCache.set(field.id, field);
                        return field;
                    });
                }

                return fieldPromise.then(field => {
                    // Проверяем наличие дополнительных параметров
                    const hasExtraParams = sensor.extraParams &&
                    Object.keys(sensor.extraParams).length > 0;

                    // Создаем индикатор для доп. параметров
                    let extraParamsIndicator;
                    if (hasExtraParams) {
                        extraParamsIndicator = `
                        <button class="btn btn-info btn-sm view-extra-params"
                            onclick="viewSensorParams('${sensor.id}',
                            '${sensor.sensorName}')">
                            <i class="fa fa-list"></i> Показать
                        </button>`;
                    } else {
                        extraParamsIndicator = '<span class="text-muted">Нет</span>';
                    }

                    // Формируем отображаемое название датчика
                    // Если есть дубликаты, добавляем короткий ID
                    let displaySensorName = sensor.sensorName;
                    const nameKey = `${sensor.field_id}_${sensor.sensorName}`;
                    if (sensorNamesByField[nameKey] > 1) {
                        const shortId = sensor.id.substring(0, 8); // Первые 8 символов ID
                        displaySensorName = `${sensor.sensorName} <small class="text-muted">(ID: ${shortId})</small>`;
                    }

                    return {
                        id: sensor.id, // Сохраняем полный ID для внутренних действий
                        sensorName: displaySensorName,
                        // Используем короткий ID для отображения в колонке "Уникальный идентификатор"
                        sensorIdentifier: sensor.id, //.substring(0, 12) + '...',
                        fieldName: field.fieldName,
                        unit: sensor.unit || '-',
                        accuracyClass: sensor.accuracyClass || '-',
                        field_id: sensor.field_id,
                        extraParams: sensor.extraParams || {},
                        extraParamsIndicator: extraParamsIndicator,
                        actions: `
                        <button class="btn btn-info btn-sm"
                            onclick="editSensor('${sensor.id}')">
                            Редактировать
                        </button>
                        <button class="btn btn-danger btn-sm"
                            onclick="showDeleteModal('${sensor.id}')">
                            Удалить
                        </button>
                        `
                    };
                });
            });

            // Обрабатываем все промисы
            Promise.all(promises)
                .then(rows => {
                    console.log("Обработанные строки для таблицы:", rows.length);

                    // Сортируем результаты по полю и названию датчика
                    rows.sort((a, b) => {
                        return a.fieldName.localeCompare(b.fieldName) ||
                               a.sensorName.localeCompare(b.sensorName);
                    });

                    // Добавляем все строки в таблицу
                    rows.forEach(row => {
                        sensorsTable.row.add(row);
                    });

                    // Перерисовываем таблицу
                    sensorsTable.draw();

                    // Удаляем пустые строки с небольшой задержкой для полной инициализации
                    setTimeout(() => {
                        sensorsTable.rows().every(function() {
                            const rowData = this.data();
                            if (!rowData ||
                                (typeof rowData === 'object' && Object.keys(rowData).length === 0) ||
                                (Array.isArray(rowData) && rowData.every(cell => !cell || cell === '-'))) {
                                this.remove();
                            }
                        });

                        sensorsTable.draw();
                    }, 100);
                })
                .catch(error => {
                    console.error('Error processing sensors data:', error);
                    alert('Ошибка при обработке данных датчиков: ' + error.message);
                });
        })
        .catch(error => {
            console.error('Error loading sensors:', error);
            alert('Не удалось загрузить список датчиков: ' + error.message);
        });
}

// Обновленная функция viewSensorParams для отображения id вместо uniqueSensorIdentifier
function viewSensorParams(sensorId, sensorName) {
    // Показываем название датчика
    $('#sensor-params-name').text(sensorName);

    // Находим tbody существующей таблицы
    const tbody = $('#sensor-params-table').find('tbody');

    // Отображаем индикатор загрузки
    tbody.html(`
        <tr>
            <td colspan="2" class="text-center">
                <div class="spinner-border" role="status">
                    <span class="sr-only">Загрузка...</span>
                </div>
                <p>Загрузка параметров...</p>
            </td>
        </tr>`);

    // Показываем модальное окно
    $('#viewSensorParamsModal').modal('show');

    // Загружаем данные датчика
    fetch(`/sensors/${sensorId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Сетевая ошибка: ${response.status}`);
            }
            return response.json();
        })
        .then(sensor => {
            console.log("Данные датчика для просмотра параметров:", sensor);

            // Очищаем содержимое tbody
            tbody.empty();

            // Асинхронно загружаем имя поля
            if (fieldsCache.has(sensor.field_id)) {
                $('#sensor-field-name-display').text(fieldsCache.get(sensor.field_id).fieldName);
            } else {
                fetch(`/fields/${sensor.field_id}`)
                    .then(response => response.json())
                    .then(field => {
                        fieldsCache.set(field.id, field);
                        $('#sensor-field-name-display').text(field.fieldName);
                    })
                    .catch(error => {
                        $('#sensor-field-name-display').text('Не удалось загрузить');
                    });
            }

            // Если есть дополнительные параметры, добавляем их в таблицу
            if (sensor.extraParams && Object.keys(sensor.extraParams).length > 0) {
                for (const [key, value] of Object.entries(sensor.extraParams)) {
                    // Преобразуем значение в строку для отображения
                    let displayValue = value;
                    if (typeof value === 'object' && value !== null) {
                        displayValue = JSON.stringify(value);
                    }

                    tbody.append(`
                        <tr>
                            <td>${key}</td>
                            <td>${displayValue}</td>
                        </tr>`);
                }
            } else {
                // Если параметров нет, отображаем сообщение
                tbody.append(`
                    <tr>
                        <td colspan="2" class="text-center">
                            У этого датчика нет дополнительных параметров
                        </td>
                    </tr>`);
            }

            // Устанавливаем фокус на кнопку закрытия
            setTimeout(() => {
                $('#viewSensorParamsModal .btn-secondary').focus();
            }, 300);
        })
        .catch(error => {
            console.error('Error fetching sensor params:', error);
            tbody.html(`
                <tr>
                    <td colspan="2" class="text-center text-danger">
                        Ошибка при загрузке параметров: ${error.message}
                    </td>
                </tr>`);
        });
}

// Функция для сброса изменений параметров к исходным
function resetEditingParams() {
    // Восстанавливаем исходные параметры
    workingParams = JSON.parse(JSON.stringify(originalParams));
}

// Обновленная функция editSensor, которая заменяет использование uniqueSensorIdentifier на id
function editSensor(sensorId) {
    selectedSensorId = sensorId;

    fetch(`/sensors/${sensorId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Сетевая ошибка: ${response.status}`);
            }
            return response.json();
        })
        .then(sensor => {
            console.log("Данные датчика для редактирования:", sensor);

            // Заполняем поля модального окна
            $('#edit-sensor-name-display').text(sensor.sensorName);
            $('#edit-sensor-name').val(sensor.sensorName);

            // Устанавливаем значение поля как disabled input
            if (fieldsCache.has(sensor.field_id)) {
                $('#edit-sensor-field-name').val(fieldsCache.get(sensor.field_id).fieldName);
            } else {
                // Если поле не в кэше, получаем его
                fetch(`/fields/${sensor.field_id}`)
                .then(response => {
                    if (!response.ok) throw new Error("Ошибка получения поля");
                    return response.json();
                })
                .then(field => {
                    fieldsCache.set(field.id, field);
                    $('#edit-sensor-field-name').val(field.fieldName);
                })
                .catch(error => {
                    console.error("Ошибка при загрузке поля:", error);
                    $('#edit-sensor-field-name').val('Не удалось загрузить');
                });
            }

            $('#edit-sensor-unit').val(sensor.unit || '');
            $('#edit-sensor-accuracy').val(sensor.accuracyClass || '');

            // Используем id вместо uniqueSensorIdentifier
            const shortId = sensor.id || '';
            $('#edit-sensor-identifier').val(shortId);

            // Сохраняем копию дополнительных параметров
            workingParams = {...(sensor.extraParams || {})};

            // Создаем исходную копию параметров
            originalParams = JSON.parse(JSON.stringify(workingParams));

            // Показываем модальное окно редактирования
            $('#editSensorModal').modal('show');
        })
        .catch(error => {
            console.error('Error fetching sensor:', error);
            alert('Ошибка при загрузке данных датчика: ' + error.message);
        });
}

// Функция для отображения модального окна с дополнительными параметрами
function showExtraParamsModal() {
    // Получаем текущее название датчика из основного модального окна
    const sensorName = $('#edit-sensor-name').val();

    // Устанавливаем название датчика в заголовке модального окна параметров
    $('#sensor-params-edit-name').text(sensorName);

    // Сохраняем исходную копию параметров для восстановления при отмене
    originalParams = JSON.parse(JSON.stringify(workingParams));

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
    $('#sensorExtraParamsModal').modal({
        backdrop: false, // Отключаем автоматический бэкдроп
        keyboard: true // Разрешаем закрытие по Esc
    });

    // Устанавливаем более высокий z-index для второго модального окна
    setTimeout(() => {
        $('#sensorExtraParamsModal').css('z-index', 1060);
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

// Обновленная функция saveSensorChanges без использования uniqueSensorIdentifier
function saveSensorChanges() {
    if (!selectedSensorId) return;

    const sensorName = $('#edit-sensor-name').val().trim();
    const unit = $('#edit-sensor-unit').val().trim();
    const accuracyClass = $('#edit-sensor-accuracy').val().trim();

    if (!sensorName) {
        alert('Название датчика не может быть пустым');
        return;
    }

    fetch(`/sensors/${selectedSensorId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Сетевая ошибка: ${response.status}`);
            }
            return response.json();
        })
        .then(sensor => {
            console.log("Исходные данные датчика:", sensor);
            console.log("Параметры для сохранения:", workingParams);

            // Обновляем только нужные поля, сохраняя остальные
            // Важно: мы не меняем field_id, поскольку датчик всегда принадлежит одному полю
            // Мы также не меняем uniqueSensorIdentifier, так как это поле сейчас не используется
            // (хотя в будущем его можно полностью удалить)
            const updatedSensor = {
                ...sensor,
                sensorName: sensorName,
                unit: unit || null,
                accuracyClass: accuracyClass || null,
                extraParams: Object.keys(workingParams).length > 0 ? workingParams : null
            };

            console.log("Обновленные данные датчика:", updatedSensor);

            return fetch(`/sensors/${selectedSensorId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedSensor)
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка при обновлении датчика: ${response.status}`);
            }
            return response.json();
        })
        .then(updatedSensor => {
            console.log('Датчик успешно обновлен:', updatedSensor);

            // Скрываем модальное окно и обновляем список
            $('#editSensorModal').modal('hide');

            // Получаем текущее значение фильтра полей
            const currentFieldFilter = $('#field-filter').val();
            loadSensors(currentFieldFilter);

            selectedSensorId = null;
        })
        .catch(error => {
            console.error('Error updating sensor:', error);
            alert('Ошибка при обновлении датчика: ' + error.message);
        });
}

// Показать модальное окно для подтверждения удаления
function showDeleteModal(sensorId) {
    selectedSensorId = sensorId;
    $('#deleteSensorModal').modal('show');
}

// Удаление датчика
function deleteSensor() {
    if (!selectedSensorId) return;

    fetch(`/sensors/${selectedSensorId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка при удалении датчика: ${response.status}`);
            }

            console.log('Датчик успешно удален');

            // Скрываем модальное окно и обновляем список
            $('#deleteSensorModal').modal('hide');

            // Получаем текущее значение фильтра полей
            const currentFieldFilter = $('#field-filter').val();
            loadSensors(currentFieldFilter);

            selectedSensorId = null;
        })
        .catch(error => {
            console.error('Error deleting sensor:', error);
            alert('Ошибка при удалении датчика: ' + error.message);
        });
}