let sensorCount = 1; // Счетчик для отображения номера датчика

$(function(){
    $("#nav-placeholder").load("/nav.html", function() {
        highlightActiveNavItem();
    });
    fetchFields();

    // Обработчик для кнопки добавления нового датчика
    $('#add-sensor-button').on('click', function() {
        addSensorInput();
    });

    // Обработчик для кнопки сохранения всех датчиков
    $('#save-all-sensors-button').on('click', function() {
        saveAllSensors();
    });

    // Делегирование событий для обработки кнопок внутри динамически созданных элементов
    // Обработчик для кнопки добавления параметра датчика
    $(document).on('click', '.add-param-button', function() {
        addSensorParam(this);
    });

    // Обработчик для кнопки удаления датчика
    $(document).on('click', '.remove-sensor', function() {
        removeSensor(this);
    });

    // Обработчик для кнопки удаления параметра
    $(document).on('click', '.remove-param', function() {
        const paramBadge = $(this).closest('.param-badge');
        const key = paramBadge.find('.param-key').text().replace(':', '');
        removeSensorParam(this, key);
    });
});

// Функция для получения списка полей
function fetchFields() {
    fetch('/fields')
        .then(response => response.json())
        .then(data => {
            const fieldSelect = document.getElementById('sensor-field-name');
            fieldSelect.innerHTML = '';

            // Сортировка полей по имени
            data.sort((a, b) => a.fieldName.localeCompare(b.fieldName));

            // Добавляем опцию выбора
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- Выберите поле --';
            fieldSelect.appendChild(defaultOption);

            // Добавляем поля
            data.forEach(field => {
                const option = document.createElement('option');
                option.value = field.id;
                option.textContent = field.fieldName;
                fieldSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching fields:', error));
}

// Функция для добавления новой группы полей для датчика
function addSensorInput() {
    sensorCount++;
    const container = document.getElementById('sensors-container');
    const sensorGroup = document.createElement('div');
    sensorGroup.className = 'sensor-group';

    sensorGroup.innerHTML = `
        <div class="sensor-header">Датчик #${sensorCount}</div>
        <span class="remove-sensor" title="Удалить датчик">&times;</span>

        <label>ID датчика:</label>
        <input type="text" class="form-control sensor-id-input" placeholder="Уникальный ID датчика">

        <label>Название датчика:</label>
        <input type="text" class="form-control sensor-name-input" placeholder="Название датчика" required>

        <label>Единицы измерения:</label>
        <input type="text" class="form-control sensor-unit-input" placeholder="Единицы измерения">

        <label>Класс точности (опционально):</label>
        <input type="text" class="form-control sensor-accuracy-input" placeholder="Класс точности">

        <label>Дополнительные параметры:</label>
        <div class="extra-params-container sensor-extra-params-list">
            <p>Нет дополнительных параметров</p>
        </div>

        <div class="extra-param-row">
            <input type="text" class="form-control sensor-param-key" placeholder="Название параметра">
            <input type="text" class="form-control sensor-param-value" placeholder="Значение параметра">
            <button type="button" class="btn btn-success add-param-button">+</button>
        </div>
    `;

    container.appendChild(sensorGroup);

    // Прокручиваем к новому датчику
    sensorGroup.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Функция для удаления группы датчика
function removeSensor(button) {
    const container = document.getElementById('sensors-container');
    const sensorGroup = $(button).closest('.sensor-group')[0];

    // Удаляем группу, если это не единственный датчик
    if (container.children.length > 1) {
        container.removeChild(sensorGroup);

        // Обновляем номера датчиков
        updateSensorNumbers();
    } else {
        alert('Должен быть хотя бы один датчик');
    }
}

// Функция для обновления номеров датчиков
function updateSensorNumbers() {
    const sensorGroups = document.querySelectorAll('.sensor-group');
    sensorGroups.forEach((group, index) => {
        const headerElement = group.querySelector('.sensor-header');
        if (headerElement) {
            headerElement.textContent = `Датчик #${index + 1}`;
        }
    });

    // Обновляем счетчик
    sensorCount = sensorGroups.length;
}

// Функция для добавления дополнительного параметра к датчику
function addSensorParam(button) {
    const sensorGroup = $(button).closest('.sensor-group')[0];
    const keyInput = sensorGroup.querySelector('.sensor-param-key');
    const valueInput = sensorGroup.querySelector('.sensor-param-value');

    const key = keyInput.value.trim();
    const value = valueInput.value.trim();

    if (!key) {
        alert('Название параметра не может быть пустым');
        return;
    }

    const paramsContainer = sensorGroup.querySelector('.sensor-extra-params-list');

    // Если это первый параметр, очищаем контейнер от сообщения "Нет параметров"
    if (paramsContainer.querySelector('p') && paramsContainer.querySelector('p').textContent === 'Нет дополнительных параметров') {
        paramsContainer.innerHTML = '';
    }

    // Проверяем, существует ли уже такой параметр
    const existingParams = paramsContainer.querySelectorAll('.param-badge');
    for (let i = 0; i < existingParams.length; i++) {
        const existingKey = existingParams[i].querySelector('.param-key').textContent.replace(':', '');
        if (existingKey === key) {
            alert(`Параметр "${key}" уже существует. Удалите его перед добавлением с таким же названием.`);
            return;
        }
    }

    // Определяем тип значения и преобразуем при необходимости
    let parsedValue = value;
    if (value.toLowerCase() === 'true') {
        parsedValue = 'true';
    } else if (value.toLowerCase() === 'false') {
        parsedValue = 'false';
    } else if (!isNaN(value) && value !== '') {
        parsedValue = value; // Оставляем как строку, но преобразуем в число при создании датчика
    }

    // Создаем бейдж для параметра
    const paramBadge = document.createElement('div');
    paramBadge.className = 'param-badge';

    paramBadge.innerHTML = `
        <span class="param-key">${key}:</span>
        <span class="param-value">${parsedValue}</span>
        <span class="remove-param">&times;</span>
    `;

    paramsContainer.appendChild(paramBadge);

    // Очищаем поля ввода
    keyInput.value = '';
    valueInput.value = '';
}

// Функция для удаления параметра датчика
function removeSensorParam(button, key) {
    const paramBadge = $(button).closest('.param-badge')[0];
    const paramsContainer = paramBadge.closest('.sensor-extra-params-list');

    // Удаляем бейдж
    paramsContainer.removeChild(paramBadge);

    // Если это был последний параметр, показываем сообщение "Нет параметров"
    if (paramsContainer.children.length === 0) {
        paramsContainer.innerHTML = '<p>Нет дополнительных параметров</p>';
    }
}

// Функция для сохранения всех датчиков
function saveAllSensors() {
    const fieldId = document.getElementById('sensor-field-name').value;
    if (!fieldId) {
        alert('Выберите поле для датчиков');
        return;
    }

    // Получаем все группы датчиков
    const sensorGroups = document.querySelectorAll('.sensor-group');
    const sensors = [];

    // Собираем данные датчиков
    sensorGroups.forEach(group => {
        const sensorName = group.querySelector('.sensor-name-input').value.trim();
        const sensorId = group.querySelector('.sensor-id-input').value.trim();
        const unit = group.querySelector('.sensor-unit-input').value.trim();
        const accuracyClass = group.querySelector('.sensor-accuracy-input').value.trim();

        if (!sensorName) {
            alert('Название датчика не может быть пустым');
            throw new Error('Название датчика не может быть пустым');
        }

        // Собираем дополнительные параметры
        const extraParams = {};
        const paramBadges = group.querySelectorAll('.param-badge');

        paramBadges.forEach(badge => {
            const key = badge.querySelector('.param-key').textContent.replace(':', '');
            let value = badge.querySelector('.param-value').textContent;

            // Преобразуем значение в соответствующий тип
            if (value === 'true') {
                value = true;
            } else if (value === 'false') {
                value = false;
            } else if (!isNaN(value) && value !== '') {
                value = Number(value);
            }

            extraParams[key] = value;
        });

        const sensor = {
            sensorName: sensorName,
            field_id: fieldId,
            uniqueSensorIdentifier: sensorId || generateUUID(), // Генерируем UUID, если ID не указан
            unit: unit || null,
            accuracyClass: accuracyClass || null
        };

        // Добавляем extraParams только если есть параметры
        if (Object.keys(extraParams).length > 0) {
            sensor.extraParams = extraParams;
        }

        sensors.push(sensor);
    });

    if (sensors.length === 0) {
        alert('Добавьте хотя бы один датчик');
        return;
    }

    // Последовательно добавляем каждый датчик
    const promises = sensors.map(sensor => {
        return fetch('/sensors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sensor)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка при создании датчика ${sensor.sensorName}`);
            }
            return response.json();
        });
    });

    // Обрабатываем все промисы
    Promise.all(promises)
        .then(results => {
            console.log('Sensors added:', results);

            // Обновляем поле, добавляя новые датчики
            return fetch(`/fields/${fieldId}`)
                .then(response => response.json())
                .then(field => {
                    const sensorIds = field.sensors || [];
                    results.forEach(sensor => {
                        if (!sensorIds.includes(sensor.id)) {
                            sensorIds.push(sensor.id);
                        }
                    });

                    return fetch(`/fields/${fieldId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            ...field,
                            sensors: sensorIds
                        })
                    });
                });
        })
        .then(() => {
            alert('Датчики успешно добавлены');

            // Очищаем форму и создаем один пустой датчик
            document.getElementById('sensors-container').innerHTML = '';
            sensorCount = 0;
            addSensorInput();
        })
        .catch(error => {
            console.error('Error adding sensors:', error);
            alert('Ошибка при добавлении датчиков: ' + error.message);
        });
}

// Вспомогательная функция для генерации UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}