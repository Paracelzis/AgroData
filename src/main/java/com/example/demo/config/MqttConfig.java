package com.example.demo.config;

import com.example.demo.model.Field;
import com.example.demo.model.SensorData;
import com.example.demo.repository.FieldRepository;
import com.example.demo.repository.SensorDataRepository;
import com.example.demo.service.SensorDataService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.paho.client.mqttv3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import javax.annotation.PreDestroy;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;

@Configuration
public class MqttConfig {

    private static final Logger logger = LoggerFactory.getLogger(MqttConfig.class);
    private static final String BROKER = "tcp://localhost:1883";
    private static final String CLIENT_ID = "SpringServerClient";
    private static final String TOPIC = "agrodata/sensor/#";

    @Autowired
    private SensorDataService sensorDataService;

    @Autowired
    private FieldRepository fieldRepository;

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
                SensorData sensorData = mapper.readValue(payload, SensorData.class);

                // Логируем новые поля, если они есть
                if (sensorData.getAccuracyClass() != null) {
                    logger.info("Accuracy class: {}", sensorData.getAccuracyClass());
                }
                if (sensorData.getExtraParams() != null) {
                    logger.info("Extra parameters: {}", sensorData.getExtraParams());
                }

                // Проверяем обязательные поля
                if (sensorData.getFieldId() == null || sensorData.getSensorName() == null || sensorData.getValue() == 0.0) {
                    logger.warn("Invalid data: fieldId, sensorName, or value is missing in payload: {}", payload);
                    return;
                }

                // Проверяем диапазон значений (например, для температуры)
                if (sensorData.getValue() < -50 || sensorData.getValue() > 50) {
                    logger.warn("Invalid temperature value: {} for sensor {}", sensorData.getValue(), sensorData.getSensorName());
                    return;
                }

                // Проверяем существование поля
                Field field = fieldRepository.findById(sensorData.getFieldId()).orElse(null);
                if (field == null) {
                    logger.warn("Field not found: {}", sensorData.getFieldId());
                    return;
                }

                // Проверяем, что датчик принадлежит полю
                boolean sensorExists = field.getSensors().stream()
                        .anyMatch(sensor -> sensor.getSensorName().equals(sensorData.getSensorName()));
                if (!sensorExists) {
                    logger.warn("Sensor {} not found in field {}", sensorData.getSensorName(), sensorData.getFieldId());
                    return;
                }

                // Преобразуем timestamp из строки в Date, если он пришел как строка
                if (sensorData.getTimestamp() == null && payload.contains("timestamp")) {
                    String timestampStr = mapper.readTree(payload).get("timestamp").asText();
                    SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
                    Date timestamp = dateFormat.parse(timestampStr);
                    sensorData.setTimestamp(timestamp);
                    logger.info("Parsed timestamp: {}", timestamp);
                }

                // Проверяем, существует ли уже запись с таким fieldId, sensorName и timestamp
                List<SensorData> existingData = sensorDataRepository.findByFieldIdAndSensorNameAndTimestampBetween(
                        sensorData.getFieldId(),
                        sensorData.getSensorName(),
                        sensorData.getTimestamp(),
                        sensorData.getTimestamp()
                );
                if (!existingData.isEmpty()) {
                    logger.warn("Duplicate sensor data detected: fieldId={}, sensorName={}, timestamp={}",
                            sensorData.getFieldId(), sensorData.getSensorName(), sensorData.getTimestamp());
                    return;
                }

                // Сохраняем данные в MongoDB
                sensorDataService.save(sensorData);
                logger.info("Saved to MongoDB: {}", sensorData);

                // Отправляем обновление через WebSocket всем подписанным клиентам
                logger.info("Sending WebSocket update to /topic/field-data/{}", sensorData.getFieldId());
                messagingTemplate.convertAndSend("/topic/field-data/" + sensorData.getFieldId(), sensorData);
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