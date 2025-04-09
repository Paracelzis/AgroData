let chart;

$(function(){
    $("#nav-placeholder").load("/nav.html", function() {
        highlightActiveNavItem();
    });
});

function fetchFields() {
    fetch('/fields')
        .then(response => response.json())
        .then(data => {
            const fieldSelect = document.getElementById('field-select');
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
            const sensorSelect = document.getElementById('sensor-select');
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
    fetchFields();
    document.getElementById('field-select').addEventListener('change', function() {
        const fieldId = this.value;
        fetchSensors(fieldId);
    });

    document.getElementById('create-chart').addEventListener('click', function() {
        const fieldId = document.getElementById('field-select').value;
        const sensorName = document.getElementById('sensor-select').value;
        const startDate = formatDate(document.getElementById('start-date').value);
        const endDate = formatDate(document.getElementById('end-date').value);

        if (!fieldId || !sensorName) {
            alert('Выберите поле и датчик.');
            return;
        }

        if (startDate == ":00" || endDate == ":00") {
            alert('Выберите временной промежуток.');
            return;
        }

        fetchData(fieldId, sensorName, startDate, endDate);
    });

    document.getElementById('create-all-time-chart').addEventListener('click', function() {
        const fieldId = document.getElementById('field-select').value;
        const sensorName = document.getElementById('sensor-select').value;

        if (!fieldId || !sensorName) {
            alert('Выберите поле и датчик.');
            return;
        }

        fetchAllData(fieldId, sensorName);
    });
});

function formatDate(dateStr) {
    return dateStr.replace('T', ' ') + ':00';
}

function createChart(data) {
    console.log('Creating chart with data:', data);

    data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const ctx = document.getElementById('chart').getContext('2d');
    if (chart) {
        chart.destroy();
    }
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(entry => entry.timestamp),
            datasets: [{
                label: 'Значение датчика',
                data: data.map(entry => ({
                    x: entry.timestamp,
                    y: entry.value
                })),
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: false
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'dd/MM/yyyy HH:mm:ss',
                        displayFormats: {
                            day: 'dd/MM/yyyy'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Дата'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Значение'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            let dateStr = tooltipItems[0].parsed.x;
                            if (typeof dateStr !== 'string') {
                                dateStr = new Date(dateStr).toISOString().replace('T', ' ').substring(0, 19);
                            }
                            const dateTimeParts = dateStr.split(' ');
                            if (dateTimeParts.length < 2) {
                                return dateStr;
                            }
                            const dateParts = dateTimeParts[0].split('-');
                            const timeParts = dateTimeParts[1].split(':');
                            const formattedDate = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]} ${timeParts[0]}:${timeParts[1]}`;
                            return formattedDate;
                        },
                        label: function(context) {
                            const label = context.dataset.label || '';
                            return `${label}: ${context.raw.y}`;
                        }
                    }
                }
            }
        }
    });
}

function fetchData(fieldId, sensorName, startDate, endDate) {
    fetch(`/sensorData/${fieldId}/${sensorName}?start=${startDate}&end=${endDate}`)
        .then(response => response.json())
        .then(data => {
            console.log('Data received:', data);
            if (data.length > 0) {
                createChart(data);
            } else {
                alert('Нет данных за выбранный период.');
            }
        })
        .catch(error => console.error('Error fetching data:', error));
}

function fetchAllData(fieldId, sensorName) {
    fetch(`/sensorData/${fieldId}/${sensorName}/all`)
        .then(response => response.json())
        .then(data => {
            console.log('Data received:', data);
            if (data.length > 0) {
                createChart(data);
            } else {
                alert('Нет данных для выбранного датчика.');
            }
        })
        .catch(error => console.error('Error fetching data:', error));
}