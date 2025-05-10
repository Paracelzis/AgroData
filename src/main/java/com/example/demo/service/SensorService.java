package com.example.demo.service;

import com.example.demo.model.Sensor;
import com.example.demo.repository.SensorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class SensorService {
    @Autowired
    private SensorRepository sensorRepository;

    // Add this method to fix the issue
    public List<Sensor> findAll() {
        return sensorRepository.findAll();
    }

    public List<Sensor> findByFieldId(String fieldId) {
        return sensorRepository.findByFieldId(fieldId);
    }

    public Optional<Sensor> findById(String id) {
        return sensorRepository.findById(id);
    }

    public Optional<Sensor> findByFieldIdAndSensorName(String fieldId, String sensorName) {
        return sensorRepository.findByField_idAndSensorName(fieldId, sensorName);
    }

    public Sensor save(Sensor sensor) {
        // Добавляем uniqueSensorIdentifier, если его нет
        if (sensor.getUniqueSensorIdentifier() == null || sensor.getUniqueSensorIdentifier().isEmpty()) {
            sensor.setUniqueSensorIdentifier(UUID.randomUUID().toString());
        }
        return sensorRepository.save(sensor);
    }

    public List<Sensor> saveAll(List<Sensor> sensors) {
        // Добавляем uniqueSensorIdentifier для каждого датчика, если его нет
        sensors.forEach(sensor -> {
            if (sensor.getUniqueSensorIdentifier() == null || sensor.getUniqueSensorIdentifier().isEmpty()) {
                sensor.setUniqueSensorIdentifier(UUID.randomUUID().toString());
            }
        });
        return sensorRepository.saveAll(sensors);
    }

    public void deleteById(String id) {
        sensorRepository.deleteById(id);
    }
}