package com.example.demo.config;

import com.example.demo.model.Field;
import com.example.demo.model.Sensor;
import com.example.demo.model.SensorData;
import com.example.demo.repository.FieldRepository;
import com.example.demo.repository.SensorDataRepository;
import com.example.demo.repository.SensorRepository;
import com.example.demo.service.SensorDataService;
import com.example.demo.service.SensorService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.paho.client.mqttv3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import jakarta.annotation.PreDestroy;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Configuration
public class MqttConfig {

    private static final Logger logger = LoggerFactory.getLogger(MqttConfig.class);
    private static final String BROKER = "tcp://localhost:1883";
    private static final String CLIENT_ID = "SpringServerClient";
    private static final String TOPIC = "agrodata/sensor/#";

    @Autowired
    private SensorDataService sensorDataService;

    @Autowired
    private SensorService sensorService;

    @Autowired
    private FieldRepository fieldRepository;

    @Autowired
    private SensorRepository sensorRepository;

    @Autowired
    private SensorDataRepository sensorDataRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private MqttClient mqttClient;

    @Bean
    public MqttClient mqttClient() throws MqttException {
        try {
            mqttClient = new MqttClient(BROKER, CLIENT_ID);
            MqttConnectOptions options = new MqttConnectOptions();
            options.setCleanSession(true);
            mqttClient.connect(options);
            logger.info("Connected to MQTT broker");
        } catch (MqttException e) {
            logger.error("Failed to connect to MQTT broker at {}: {}", BROKER, e.getMessage());
            throw e;
        }

        mqttClient.subscribe(TOPIC, (topic, message) -> {
            try {
                String payload = new String(message.getPayload());
                logger.info("Received message on topic {}: {}", topic, payload);

                ObjectMapper mapper = new ObjectMapper();
                Map<String, Object> data = mapper.readValue(payload, Map.class);

                // Получаем или создаем данные сенсора
                SensorData sensorData = new SensorData();

                // Проверяем обязательные поля
                if (data.get("fieldId") == null || data.get("sensorName") == null ||
                        data.get("value") == null || ((Number)data.get("value")).doubleValue() == 0.0) {
                    logger.warn("Invalid data: fieldId, sensorName, or value is missing in payload: {}", payload);
                    return;
                }

                String fieldId = (String)data.get("fieldId");
                String sensorName = (String)data.get("sensorName");
                double value = ((Number)data.get("value")).doubleValue();

                // Проверяем диапазон значений (например, для температуры)
                if (value < -50 || value > 50) {
                    logger.warn("Invalid temperature value: {} for sensor {}", value, sensorName);
                    return;
                }

                // Проверяем существование поля
                Optional<Field> fieldOpt = fieldRepository.findById(fieldId);
                if (!fieldOpt.isPresent()) {
                    logger.warn("Field not found: {}", fieldId);
                    return;
                }
                Field field = fieldOpt.get();

                // Находим датчик по имени и ID поля или создаем новый
                Optional<Sensor> sensorOpt = sensorRepository.findByField_idAndSensorName(fieldId, sensorName);
                Sensor sensor;

                if (!sensorOpt.isPresent()) {
                    // Создаем новый датчик, если он не существует
                    logger.info("Creating new sensor {} for field {}", sensorName, fieldId);
                    sensor = new Sensor();
                    sensor.setField_id(fieldId);
                    sensor.setSensorName(sensorName);
                    sensor.setUniqueSensorIdentifier(java.util.UUID.randomUUID().toString());

                    if (data.get("unit") != null) {
                        sensor.setUnit((String)data.get("unit"));
                    }

                    if (data.get("accuracyClass") != null) {
                        sensor.setAccuracyClass((String)data.get("accuracyClass"));
                    }

                    // Сохраняем новый датчик
                    sensor = sensorRepository.save(sensor);

                    // Обновляем поле, добавляя новый датчик
                    List<String> fieldSensors = field.getSensors();
                    if (fieldSensors == null) {
                        fieldSensors = new java.util.ArrayList<>();
                    }
                    fieldSensors.add(sensor.getId());
                    field.setSensors(fieldSensors);
                    fieldRepository.save(field);
                } else {
                    sensor = sensorOpt.get();
                }

                // Заполняем данные с датчика
                sensorData.setSensor_id(sensor.getId());
                sensorData.setField_id(fieldId);
                sensorData.setValue(value);

                if (data.get("unit") != null) {
                    sensor.setUnit((String)data.get("unit"));
                    sensorRepository.save(sensor);
                }

                // Преобразуем timestamp из строки в Date, если он пришел как строка
                if (data.get("timestamp") != null) {
                    if (data.get("timestamp") instanceof String) {
                        String timestampStr = (String)data.get("timestamp");
                        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
                        Date timestamp = dateFormat.parse(timestampStr);
                        sensorData.setTimestamp(timestamp);
                    } else if (data.get("timestamp") instanceof Number) {
                        long timestamp = ((Number)data.get("timestamp")).longValue();
                        sensorData.setTimestamp(new Date(timestamp));
                    }
                } else {
                    sensorData.setTimestamp(new Date());
                }

                // Логируем дополнительные поля
                if (data.get("accuracyClass") != null) {
                    logger.info("Accuracy class: {}", data.get("accuracyClass"));
                    sensor.setAccuracyClass((String)data.get("accuracyClass"));
                    sensorRepository.save(sensor);
                }

                // Обрабатываем дополнительные параметры
                if (data.get("extraParams") != null) {
                    Map<String, Object> extraParams = (Map<String, Object>)data.get("extraParams");
                    logger.info("Extra parameters: {}", extraParams);
                    sensorData.setExtraParams(extraParams);
                }

                // Устанавливаем uniqueIndex
                sensorData.setUniqueIndex(java.util.UUID.randomUUID().toString());

                // Проверяем, существует ли уже запись с таким sensorId и timestamp
                // Используем исправленный метод репозитория
                List<SensorData> existingData = sensorDataRepository.findBySensorIdAndTimestampBetween(
                        sensor.getId(),
                        sensorData.getTimestamp(),
                        sensorData.getTimestamp()
                );

                if (!existingData.isEmpty()) {
                    logger.warn("Duplicate sensor data detected: sensorId={}, timestamp={}",
                            sensor.getId(), sensorData.getTimestamp());
                    return;
                }

                // Сохраняем данные в MongoDB
                SensorData savedData = sensorDataService.save(sensorData);
                logger.info("Saved to MongoDB: {}", savedData);

                // Отправляем обновление через WebSocket всем подписанным клиентам
                logger.info("Sending WebSocket update to /topic/field-data/{}", fieldId);
                messagingTemplate.convertAndSend("/topic/field-data/" + fieldId, savedData);
            } catch (Exception e) {
                logger.error("Error processing MQTT message: {}", e.getMessage(), e);
            }
        });

        return mqttClient;
    }

    @PreDestroy
    public void disconnect() throws MqttException {
        if (mqttClient != null && mqttClient.isConnected()) {
            mqttClient.disconnect();
            logger.info("Disconnected from MQTT broker");
        }
    }
}