package com.example.demo.service;

import com.example.demo.model.SensorData;
import com.example.demo.repository.SensorDataRepository;
import com.example.demo.repository.SensorRepository;
import org.eclipse.paho.client.mqttv3.logging.Logger;
import org.eclipse.paho.client.mqttv3.logging.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.logging.ErrorManager;

@Service
public class SensorDataService {
    @Autowired
    private SensorDataRepository sensorDataRepository;

    @Autowired
    private SensorRepository sensorRepository;

    private SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    public List<SensorData> getSensorData(String fieldId, String sensorId, String startDate, String endDate) throws ParseException {
        Date start = dateFormat.parse(startDate);
        Date end = dateFormat.parse(endDate);
        return sensorDataRepository.findByFieldIdAndSensorIdAndTimestampBetween(fieldId, sensorId, start, end);
    }

    public List<SensorData> getAllTimeSensorData(String fieldId, String sensorId) {
        return sensorDataRepository.findBySensorId(sensorId);
    }

    public List<SensorData> saveAll(List<SensorData> sensorData) {
        // Добавляем uniqueIndex для каждой записи, если его нет
        sensorData.forEach(data -> {
            if (data.getUniqueIndex() == null || data.getUniqueIndex().isEmpty()) {
                data.setUniqueIndex(UUID.randomUUID().toString());
            }
        });
        return sensorDataRepository.saveAll(sensorData);
    }

    public Optional<SensorData> findById(String id) {
        return sensorDataRepository.findById(id);
    }

    public boolean existsById(String id) {
        return sensorDataRepository.existsById(id);
    }

    public SensorData save(SensorData sensorData) {
        // Добавляем uniqueIndex, если его нет
        if (sensorData.getUniqueIndex() == null || sensorData.getUniqueIndex().isEmpty()) {
            sensorData.setUniqueIndex(UUID.randomUUID().toString());
        }
        return sensorDataRepository.save(sensorData);
    }

    public void deleteById(String id) {
        sensorDataRepository.deleteById(id);
    }

    public Page<SensorData> findByFieldIdOrderByTimestampDesc(String fieldId, Pageable pageable) {
        return sensorDataRepository.findByFieldIdOrderByTimestampDesc(fieldId, pageable);
    }

    public Page<SensorData> findByFieldIdAndSearchText(String fieldId, String searchText, Pageable pageable) {
        // Реализация зависит от вашей базы данных
        // Для MongoDB можно использовать Criteria API
        return sensorDataRepository.findByFieldIdAndSearchText(fieldId, searchText, pageable);
    }

    public long countByFieldId(String fieldId) {
        return sensorDataRepository.countByFieldId(fieldId);
    }

    public long countBySensorId(String sensorId) {
        try {
            return sensorDataRepository.countBySensor_id(sensorId);
        } catch (Exception e) {
            e.printStackTrace();
            // В случае ошибки возвращаем 0
            return 0;
        }
    }

    public void deleteBySensorId(String sensorId) {
        try {
            sensorDataRepository.deleteBySensor_id(sensorId);
        } catch (Exception e) {
            e.printStackTrace();
            // Простой вывод в консоль
            System.err.println("Error deleting sensor data for sensorId " + sensorId + ": " + e.getMessage());
        }
    }
}