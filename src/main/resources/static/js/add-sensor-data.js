$(function(){
    $("#nav-placeholder").load("/nav.html", function() {
        highlightActiveNavItem();
    });
    fetchFields();
});

function fetchFields() {
    fetch('/fields')
        .then(response => response.json())
        .then(data => {
            const fieldSelect = document.getElementById('manual-field-name');
            fieldSelect.innerHTML = '';
            data.sort((a, b) => a.fieldName.localeCompare(b.fieldName));
            data.forEach(field => {
                const option = document.createElement('option');
                option.value = field.id;
                option.textContent = field.fieldName;
                fieldSelect.appendChild(option);
            });
            if (data.length > 0) {
                fetchSensors(data[0].id);
            }
        })
        .catch(error => console.error('Error fetching fields:', error));
}

function fetchSensors(fieldId) {
    fetch(`/fields/${fieldId}`)
        .then(response => response.json())
        .then(field => {
            const sensorSelect = document.getElementById('manual-sensor-name');
            sensorSelect.innerHTML = '';
            field.sensors.sort((a, b) => a.sensorName.localeCompare(b.sensorName));
            field.sensors.forEach(sensor => {
                const option = document.createElement('option');
                option.value = sensor.sensorName;
                option.textContent = sensor.sensorName;
                sensorSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching sensors:', error));
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('manual-field-name').addEventListener('change', function() {
        const fieldId = this.value;
        fetchSensors(fieldId);
    });
});

function fetchFieldIdByName(fieldName) {
    return fetch('/fields')
        .then(response => response.json())
        .then(fields => {
            const field = fields.find(f => f.fieldName === fieldName);
            if (field) {
                return field.id;
            } else {
                throw new Error('Поле с таким названием не найдено');
            }
        });
}

function fetchFieldById(fieldId) {
    return fetch(`/fields/${fieldId}`)
        .then(response => response.json());
}

function uploadSensorData() {
    let data;
    try {
        data = JSON.parse(document.getElementById('sensor-data').value);
    } catch (e) {
        alert('Некорректный формат JSON: ' + e.message);
        return;
    }

    for (let entry of data) {
        if (!entry.unit || !entry.fieldId || !entry.sensorName || !entry.value || !entry.timestamp) {
            alert('Все поля должны быть заполнены');
            return;
        }
    }

    processAndUploadData(data);
}

function uploadSensorDataFromFile() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    if (!file) {
        alert('Выберите файл для загрузки');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        let data;
        try {
            data = JSON.parse(event.target.result);
        } catch (e) {
            alert('Некорректный формат JSON в файле: ' + e.message);
            return;
        }

        for (let entry of data) {
            if (!entry.unit || !entry.fieldId || !entry.sensorName || !entry.value || !entry.timestamp) {
                alert('Все поля должны быть заполнены');
                return;
            }
        }

        processAndUploadData(data);
    };

    reader.readAsText(file);
}

function processAndUploadData(data) {
    const promises = data.map(entry => {
        return fetchFieldIdByName(entry.fieldId)
            .then(fieldId => fetchFieldById(fieldId)
                .then(field => {
                    if (field.sensors.some(sensor => sensor.sensorName === entry.sensorName)) {
                        entry.fieldId = fieldId;
                        return entry;
                    } else {
                        throw new Error(`Датчик "${entry.sensorName}" не найден в поле "${field.fieldName}"`);
                    }
                })
            );
    });

    Promise.all(promises)
        .then(updatedData => {
            return fetch('/sensorData', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка сети при загрузке данных');
            }
            return response.json();
        })
        .then(data => {
            console.log('Sensor data uploaded:', data);
            alert('Данные успешно загружены');
        })
        .catch(error => {
            console.error('Ошибка при загрузке данных:', error);
            alert('Ошибка при загрузке данных: ' + error.message);
        });
}

function addManualSensorData() {
    const fieldId = document.getElementById('manual-field-name').value;
    const sensorName = document.getElementById('manual-sensor-name').value.trim();
    const value = document.getElementById('manual-sensor-value').value;
    const unit = document.getElementById('manual-sensor-unit').value.trim();
    const timestamp = document.getElementById('manual-sensor-timestamp').value;
    const accuracyClass = document.getElementById('manual-accuracy-class').value.trim();
    const extraParamsInput = document.getElementById('manual-extra-params').value.trim();

    if (!fieldId || !sensorName || !value || !unit || !timestamp) {
        alert('Все обязательные поля должны быть заполнены');
        return;
    }

    let extraParams = null;
    if (extraParamsInput) {
        try {
            extraParams = JSON.parse(extraParamsInput);
        } catch (e) {
            alert('Некорректный формат дополнительных параметров: ' + e.message);
            return;
        }
    }

    const data = [{
        fieldId: fieldId,
        sensorName: sensorName,
        value: parseFloat(value),
        unit: unit,
        timestamp: timestamp,
        accuracyClass: accuracyClass || null,
        extraParams: extraParams
    }];

    fetchFieldById(fieldId)
        .then(field => {
            if (field.sensors.some(sensor => sensor.sensorName === sensorName)) {
                return fetch('/sensorData', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
            } else {
                throw new Error(`Датчик "${sensorName}" не найден в поле "${field.fieldName}"`);
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка сети при добавлении данных');
            }
            return response.json();
        })
        .then(data => {
            console.log('Manual sensor data added:', data);
            alert('Данные успешно добавлены');
        })
        .catch(error => {
            console.error('Ошибка при добавлении данных:', error);
            alert('Ошибка при добавлении данных: ' + error.message);
        });
}