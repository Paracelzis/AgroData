let selectedFieldId = null;
let fieldsWithData = [];

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
});

function fetchFields() {
    fetch('/fields')
        .then(response => response.json())
        .then(data => {
            const table = $('#fields-table').DataTable();
            table.clear();
            data.forEach(field => {
                fetch(`/sensorData/field/${field.id}?page=0&size=1`)
                    .then(response => response.json())
                    .then(sensorData => {
                        if (sensorData.length > 0) {
                            fieldsWithData.push(field.id);
                        }
                        table.row.add([
                            field.fieldName,
                            field.sensors.map(sensor => sensor.sensorName).join(', '),
                            `<button class="btn btn-info btn-sm" onclick="editField('${field.id}')">Редактировать</button>
                             <button class="btn btn-danger btn-sm" onclick="confirmDeleteField('${field.id}')">Удалить</button>`
                        ]).draw();
                    });
            });
        })
        .catch(error => console.error('Error fetching fields:', error));
}

function addSensorInput() {
    const container = document.getElementById('sensors-container');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control sensor-input';
    input.placeholder = 'Название датчика';
    container.appendChild(input);
    input.style.marginTop = '10px';
}

function removeLastSensorInput() {
    const container = document.getElementById('sensors-container');
    if (container.children.length > 1) {
        container.removeChild(container.lastChild);
    }
}

function addField() {
    const fieldName = document.getElementById('new-field-name').value.trim();
    const sensorInputs = document.getElementsByClassName('sensor-input');
    const sensors = Array.from(sensorInputs).map(input => ({ sensorName: input.value.trim() }));

    if (!fieldName) {
        alert('Название поля не может быть пустым');
        return;
    }

    if (sensors.some(sensor => !sensor.sensorName)) {
        alert('Название датчика не может быть пустым');
        return;
    }

    fetch('/fields')
        .then(response => response.json())
        .then(fields => {
            if (fields.some(field => field.fieldName === fieldName)) {
                alert('Поле с таким названием уже существует');
                throw new Error('Поле с таким названием уже существует');
            }
            return fetch('/fields', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fieldName, sensors })
            });
        })
        .then(response => response.json())
        .then(data => {
            console.log('Field added:', data);
            fetchFields();
            resetForm();
        })
        .catch(error => console.error('Error adding field:', error));
}

function resetForm() {
    document.getElementById('new-field-name').value = '';
    const container = document.getElementById('sensors-container');
    container.innerHTML = '<input type="text" class="form-control sensor-input" placeholder="Название датчика">';
}

function editField(fieldId) {
    selectedFieldId = fieldId;

    fetch(`/fields/${fieldId}`)
        .then(response => response.json())
        .then(field => {
            document.getElementById('edit-field-name').value = field.fieldName;
            const container = document.getElementById('edit-sensors-container');
            container.innerHTML = '';
            field.sensors.forEach(sensor => {
                const div = document.createElement('div');
                div.className = 'input-group mb-2';
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-control sensor-input';
                input.placeholder = 'Название датчика';
                input.value = sensor.sensorName;
                const removeButton = document.createElement('div');
                removeButton.className = 'input-group-append';
                removeButton.innerHTML = `<button class="btn btn-danger" type="button" onclick="removeSensorInput(this)">Удалить</button>`;
                div.appendChild(input);
                div.appendChild(removeButton);
                container.appendChild(div);
            });

            if (fieldsWithData.includes(fieldId)) {
                document.getElementById('edit-field-name').disabled = true;
                container.querySelectorAll('.sensor-input').forEach(input => {
                    input.disabled = true;
                });
                container.querySelectorAll('.btn-danger').forEach(button => {
                    button.disabled = true;
                });
                document.getElementById('removeLastEditSensorButton').style.display = 'none';
            } else {
                document.getElementById('edit-field-name').disabled = false;
                container.querySelectorAll('.sensor-input').forEach(input => {
                    input.disabled = false;
                });
                container.querySelectorAll('.btn-danger').forEach(button => {
                    button.disabled = false;
                });
                document.getElementById('removeLastEditSensorButton').style.display = 'block';
            }

            $('#editFieldModal').modal('show');
        })
        .catch(error => console.error('Error fetching field:', error));
}

function addEditSensorInput() {
    const container = document.getElementById('edit-sensors-container');
    const div = document.createElement('div');
    div.className = 'input-group mb-2';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control sensor-input';
    input.placeholder = 'Название датчика';
    const removeButton = document.createElement('div');
    removeButton.className = 'input-group-append';
    removeButton.innerHTML = `<button class="btn btn-danger" type="button" onclick="removeSensorInput(this)">Удалить</button>`;
    div.appendChild(input);
    div.appendChild(removeButton);
    container.appendChild(div);
}

function removeLastEditSensorInput() {
    const container = document.getElementById('edit-sensors-container');
    if (container.children.length > 1) {
        container.removeChild(container.lastChild);
    }
}

function removeSensorInput(element) {
    const container = element.parentElement.parentElement.parentElement;
    if (container.children.length > 1) {
        container.removeChild(element.parentElement.parentElement);
    }
}

function saveFieldChanges() {
    const fieldName = document.getElementById('edit-field-name').value.trim();
    const sensorInputs = document.querySelectorAll('#edit-sensors-container .sensor-input');
    const sensors = Array.from(sensorInputs).map(input => ({ sensorName: input.value.trim() }));

    if (!fieldName) {
        alert('Название поля не может быть пустым');
        return;
    }

    if (sensors.some(sensor => !sensor.sensorName)) {
        alert('Название датчика не может быть пустым');
        return;
    }

    fetch(`/fields/${selectedFieldId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fieldName, sensors })
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
        fetchFields();
    })
    .catch(error => console.error('Error deleting field:', error));
}